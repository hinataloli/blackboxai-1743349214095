from flask import Flask, request, render_template, session, jsonify, redirect, url_for, Response
import requests
import json
import os
import pandas as pd
from datetime import datetime
from openai import OpenAI
from flask_session import Session

app = Flask(__name__)

# Configure Flask Session
app.config['SECRET_KEY'] = os.environ.get("SESSION_SECRET", "your_secret_key_here")
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# Function to get comments from TikTok
def get_tiktok_comments(video_id):
    url = f"https://www.tiktok.com/api/comment/list/?aid=1988&app_language=ja-JP&app_name=tiktok_web&aweme_id={video_id}&browser_language=vi-VN&browser_name=Mozilla&browser_online=true&browser_platform=MacIntel&browser_version=5.0%20%28Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F133.0.0.0%20Safari%2F537.36&channel=tiktok_web&cookie_enabled=true&count=50&current_region=JP&cursor=0"

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "Referer": "https://www.tiktok.com/",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        try:
            data = response.json()
            comments = data.get("comments", [])

            if comments:
                result = []
                for comment in comments:
                    user = comment.get("user", {})
                    nickname = user.get("nickname", "Ẩn danh")
                    unique_id = user.get("unique_id", "Không có ID")
                    text = comment.get("text", "Không có bình luận")
                    digg_count = comment.get("digg_count", 0)
                    create_time = comment.get("create_time", 0)
                    avatar = user.get("avatar_thumb", {}).get("url_list", [""])[0]

                    result.append({
                        "nickname": nickname,
                        "unique_id": unique_id,
                        "text": text,
                        "likes": digg_count,
                        "timestamp": create_time,
                        "avatar": avatar
                    })
                return result
            else:
                return [{"nickname": "Hệ thống", "unique_id": "system", "text": "⚠️ Không có comment nào."}]
        except json.JSONDecodeError:
            return [{"nickname": "Hệ thống", "unique_id": "system", "text": "❌ Lỗi: Không thể phân tích JSON."}]
    else:
        return [{"nickname": "Hệ thống", "unique_id": "system", "text": f"❌ Lỗi khi gửi request: {response.status_code}"}]

# Function to analyze emotions
def analyze_emotion(comment_text):
    client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")
    try:
        response = client.chat.completions.create(
            model="gemma-3-4b-it",
            messages=[
                {"role": "system", "content": "Bạn là chuyên gia phân tích cảm xúc. Phân tích và trả về: Tích cực, Tiêu cực, hoặc Trung lập."},
                {"role": "user", "content": f"Phân tích cảm xúc: {comment_text}"}
            ],
            temperature=0.7,
        )
        result = response.choices[0].message.content.lower()
        if "tích cực" in result:
            return "Tích cực", "Tốt"
        elif "tiêu cực" in result:
            return "Tiêu cực", "Xấu"
        return "Trung lập", "Trung lập"
    except Exception as e:
        return "Lỗi", f"Đéo phân tích được, lỗi: {str(e)}"

# Function to moderate content
def moderate_content(text):
    client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")
    try:
        response = client.chat.completions.create(
            model="gemma-3-4b-it", 
            messages=[
                {"role": "system", "content": "Bạn là hệ thống kiểm duyệt nội dung. Kiểm tra xem văn bản có chứa nội dung không phù hợp không như: ngôn từ thù ghét, gợi dục, lăng mạ, bạo lực, đe dọa. Trả về: CÓ nếu phát hiện nội dung không phù hợp, kèm theo lý do. Trả về: KHÔNG nếu nội dung phù hợp."},
                {"role": "user", "content": f"Kiểm duyệt nội dung sau: {text}"}
            ],
            temperature=0.5,
        )
        result = response.choices[0].message.content
        if "CÓ" in result.upper():
            reason = result.split("CÓ")[1] if len(result.split("CÓ")) > 1 else ""
            return False, reason.strip()
        return True, ""
    except Exception as e:
        return True, f"Lỗi kiểm duyệt: {str(e)}"

# Function to ask AI
def ask_ai(query, stream=False):
    client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")
    try:
        response = client.chat.completions.create(
            model="gemma-3-4b-it",
            messages=[
                {"role": "system", "content": "Bạn là trợ lý AI thông minh, trả lời chính xác và tự nhiên bằng tiếng Việt. Định dạng dữ liệu đầu ra của bạn rõ ràng và đẹp. Sử dụng định dạng Markdown khi cần thiết để làm nổi bật các phần quan trọng."},
                {"role": "user", "content": query}
            ],
            temperature=0.7,
            stream=stream
        )
        
        if stream:
            # Return generator for streaming
            return response
        else:
            # Return full response for non-streaming
            return response.choices[0].message.content
    except Exception as e:
        return f"Lỗi: {str(e)}"

# Calculate statistics from comments
def calculate_statistics(results):
    if not results or len(results) == 0:
        return {}
    
    # Convert to pandas DataFrame for easier analysis
    df = pd.DataFrame(results)
    
    # Count sentiments
    sentiment_counts = df['emotion'].value_counts().to_dict()
    
    # Get most active commenters
    top_commenters = df['nickname'].value_counts().head(5).to_dict()
    
    # Extract common phrases/words (simplified)
    all_text = ' '.join(df['text'].tolist())
    words = all_text.lower().split()
    word_counts = {}
    for word in words:
        if len(word) > 3:  # Skip short words
            word_counts[word] = word_counts.get(word, 0) + 1
    
    top_words = {k: v for k, v in sorted(word_counts.items(), key=lambda item: item[1], reverse=True)[:20]}
    
    # Most positive and negative comments
    try:
        most_positive = df[df['emotion'] == 'Tích cực'].iloc[0].to_dict() if 'Tích cực' in df['emotion'].values else {}
        most_negative = df[df['emotion'] == 'Tiêu cực'].iloc[0].to_dict() if 'Tiêu cực' in df['emotion'].values else {}
    except (IndexError, KeyError):
        most_positive = {}
        most_negative = {}
    
    # Return statistics
    return {
        'total_comments': len(results),
        'sentiment_distribution': sentiment_counts,
        'top_commenters': top_commenters,
        'common_words': top_words,
        'most_positive_comment': most_positive,
        'most_negative_comment': most_negative
    }

# Main route
@app.route("/", methods=["GET"])
def index():
    results = session.get('results', [])
    chat_history = session.get('chat_history', [])
    return render_template("index.html", results=results, chat_history=chat_history)

# Route for statistics page
@app.route("/statistics", methods=["GET"])
def statistics_page():
    results = session.get('results', [])
    stats = calculate_statistics(results)
    return render_template("statistics.html", results=results, stats=stats)

# Route to analyze TikTok comments
@app.route("/analyze", methods=["POST"])
def analyze():
    video_id = request.form.get("video_id")
    moderate = request.form.get("moderate", "false") == "true"
    
    if not video_id:
        return jsonify([{"nickname": "Hệ thống", "unique_id": "system", "text": "Nhập mã video ID!"}])
    
    # Check if it's a batch operation
    video_ids = video_id.split(',')
    all_results = []
    
    for vid in video_ids:
        vid = vid.strip()
        comments = get_tiktok_comments(vid)
        results = []
        
        for comment in comments:
            # Check if this is a system message
            if comment.get("unique_id") == "system":
                results.append(comment)
                continue
                
            # Analyze emotion
            emotion, conclusion = analyze_emotion(comment["text"])
            
            # Add to result
            comment_result = {
                "nickname": comment["nickname"],
                "unique_id": comment["unique_id"],
                "text": comment["text"],
                "emotion": emotion,
                "conclusion": conclusion,
                "video_id": vid,
                "timestamp": comment.get("timestamp", 0),
                "likes": comment.get("likes", 0),
                "avatar": comment.get("avatar", ""),
                "flagged": False,
                "flag_reason": ""
            }
            
            # Apply content moderation if requested
            if moderate:
                is_appropriate, reason = moderate_content(comment["text"])
                if not is_appropriate:
                    comment_result["flagged"] = True
                    comment_result["flag_reason"] = reason
            
            results.append(comment_result)
        
        all_results.extend(results)
    
    # Store in session for statistics
    session['results'] = all_results
    session.modified = True
    
    return jsonify(all_results)

# Route to filter results
@app.route("/filter", methods=["POST"])
def filter_results():
    results = session.get('results', [])
    filter_type = request.form.get("filter_type")
    
    if not results:
        return jsonify([{"nickname": "Hệ thống", "unique_id": "system", "text": "Không có dữ liệu để lọc."}])
    
    filtered_results = results.copy()
    
    if filter_type == "positive":
        filtered_results = [r for r in results if r.get("emotion") == "Tích cực"]
    elif filter_type == "negative":
        filtered_results = [r for r in results if r.get("emotion") == "Tiêu cực"]
    elif filter_type == "neutral":
        filtered_results = [r for r in results if r.get("emotion") == "Trung lập"]
    elif filter_type == "flagged":
        filtered_results = [r for r in results if r.get("flagged", False)]
    elif filter_type == "most_likes":
        filtered_results = sorted(results, key=lambda x: x.get("likes", 0), reverse=True)
    elif filter_type == "oldest":
        filtered_results = sorted(results, key=lambda x: x.get("timestamp", 0))
    elif filter_type == "newest":
        filtered_results = sorted(results, key=lambda x: x.get("timestamp", 0), reverse=True)
    
    return jsonify(filtered_results)

# Route to export data
@app.route("/export", methods=["POST"])
def export_data():
    results = session.get('results', [])
    export_type = request.form.get("export_type", "csv")
    
    if not results:
        return jsonify({"error": "Không có dữ liệu để xuất."}), 400
    
    # Create a dataframe from results
    df = pd.DataFrame(results)
    
    # Format timestamp if present
    if 'timestamp' in df.columns:
        df['formatted_date'] = df['timestamp'].apply(
            lambda x: datetime.fromtimestamp(int(x)).strftime('%Y-%m-%d %H:%M:%S') 
            if x and str(x).isdigit() else ''
        )
    
    # Select and rename columns for export
    export_columns = [
        'nickname', 'unique_id', 'text', 'emotion', 'conclusion', 
        'likes', 'formatted_date', 'flagged', 'flag_reason', 'video_id'
    ]
    
    # Filter to only available columns
    export_columns = [col for col in export_columns if col in df.columns]
    
    if export_type == "csv":
        csv_data = df[export_columns].to_csv(index=False)
        return jsonify({"data": csv_data, "type": "csv"})
    
    elif export_type == "json":
        json_data = df[export_columns].to_json(orient='records')
        return jsonify({"data": json_data, "type": "json"})
    
    return jsonify({"error": "Định dạng không được hỗ trợ."}), 400

# Route to ask AI
@app.route("/ask_ai", methods=["POST", "GET"])
def ai_query():
    if request.method == "POST":
        query = request.form.get("ai_query")
        save_history = request.form.get("save_history", "true") == "true"
        stream_mode = request.form.get("stream", "false") == "true"
    else:  # GET method
        query = request.args.get("ai_query")
        save_history = request.args.get("save_history", "true") == "true"
        stream_mode = request.args.get("stream", "false") == "true"
    
    if not query:
        return jsonify({"ai_response": "Nhập câu hỏi!"})
    
    if stream_mode:
        # Use streaming response
        def generate():
            # Start with empty response
            full_response = ""
            
            try:
                # Stream the response chunk by chunk
                stream_response = ask_ai(query, stream=True)
                for chunk in stream_response:
                    if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content is not None:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield f"data: {json.dumps({'chunk': content, 'full': full_response})}\n\n"
                
                # Save chat history at the end of streaming
                if save_history:
                    chat_history = session.get('chat_history', [])
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    
                    chat_entry = {
                        "query": query,
                        "response": full_response,
                        "timestamp": timestamp,
                        "id": f"chat_{len(chat_history)}"
                    }
                    
                    chat_history.append(chat_entry)
                    session['chat_history'] = chat_history
                    session.modified = True
                
                # Send end marker
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                error_msg = f"Lỗi: {str(e)}"
                yield f"data: {json.dumps({'chunk': error_msg, 'full': error_msg})}\n\n"
                yield "data: [DONE]\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
    else:
        # Use non-streaming response for backward compatibility
        response = ask_ai(query)
        
        # Save to chat history if requested
        if save_history:
            chat_history = session.get('chat_history', [])
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            chat_entry = {
                "query": query,
                "response": response,
                "timestamp": timestamp,
                "id": f"chat_{len(chat_history)}"
            }
            
            chat_history.append(chat_entry)
            session['chat_history'] = chat_history
            session.modified = True
        
        return jsonify({"ai_response": response})

# Route to clear results
@app.route("/clear_results", methods=["POST"])
def clear_results():
    session['results'] = []
    session.modified = True
    return jsonify({"status": "success"})

# Route to clear chat history
@app.route("/clear_chat", methods=["POST"])
def clear_chat():
    session['chat_history'] = []
    session.modified = True
    return jsonify({"status": "success"})

# Route to get statistics data for AJAX
@app.route("/get_statistics", methods=["GET"])
def get_statistics():
    results = session.get('results', [])
    stats = calculate_statistics(results)
    return jsonify(stats)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
