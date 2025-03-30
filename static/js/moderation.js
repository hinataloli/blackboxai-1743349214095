document.addEventListener('DOMContentLoaded', function() {
    // Select relevant elements
    const moderateContentCheckbox = document.getElementById('moderate-content');
    const analyzerForm = document.getElementById('analyzer-form');
    const resultsDiv = document.getElementById('results');
    
    // Track moderation state
    let moderationEnabled = false;
    
    // Initialize moderation state from form
    if (moderateContentCheckbox) {
        moderationEnabled = moderateContentCheckbox.checked;
        
        // Add event listener for checkbox changes
        moderateContentCheckbox.addEventListener('change', function() {
            moderationEnabled = this.checked;
            
            // Show a notification when moderation is toggled
            const message = moderationEnabled 
                ? 'Kiểm duyệt nội dung đã được bật' 
                : 'Kiểm duyệt nội dung đã được tắt';
            showNotification(message);
            
            // If there are already results, re-analyze with new moderation setting
            if (resultsDiv && resultsDiv.children.length > 0 && !resultsDiv.querySelector('.empty-state')) {
                const videoIdInput = document.querySelector("input[name='video_id']");
                if (videoIdInput && videoIdInput.value) {
                    reAnalyzeWithModeration(videoIdInput.value, moderationEnabled);
                }
            }
        });
    }
    
    // Function to re-analyze comments with moderation setting
    function reAnalyzeWithModeration(videoId, moderate) {
        // Show loading state
        resultsDiv.innerHTML = `
            <div class="comment-card loading-state">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Đang ${moderate ? 'kiểm duyệt' : 'phân tích'} bình luận...</p>
                </div>
            </div>
        `;
        
        fetch("/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ 
                "video_id": videoId,
                "moderate": moderate
            })
        })
        .then(response => response.json())
        .then(data => {
            resultsDiv.innerHTML = "";
            
            if (data.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comment-slash"></i>
                        <p>Không tìm thấy bình luận nào cho video này.</p>
                    </div>`;
                return;
            }
            
            if (data[0].nickname === "Hệ thống") {
                resultsDiv.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${data[0].text}</p>
                    </div>`;
                return;
            }
            
            // Create comment cards
            data.forEach((result, index) => {
                setTimeout(() => {
                    createCommentCard(result, resultsDiv);
                }, index * 100);
            });
            
            // Show summary of flagged comments if moderation is enabled
            if (moderate) {
                const flaggedComments = data.filter(comment => comment.flagged);
                if (flaggedComments.length > 0) {
                    showModerationSummary(flaggedComments, data.length);
                }
            }
            
            showNotification(`Đã phân tích ${data.length} bình luận thành công!`);
        })
        .catch(error => {
            console.error("Error:", error);
            resultsDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Đã xảy ra lỗi khi xử lý yêu cầu: ${error.message}</p>
                </div>`;
        });
    }
    
    // Function to create a comment card (copied from script.js for consistency)
    function createCommentCard(result, container) {
        const card = document.createElement("div");
        card.className = "comment-card";
        if (result.flagged) {
            card.classList.add("flagged");
        }
        
        // Get appropriate icon based on emotion
        let emotionIcon = 'fa-meh';
        if (result.emotion === 'Tích cực') {
            emotionIcon = 'fa-smile';
        } else if (result.emotion === 'Tiêu cực') {
            emotionIcon = 'fa-frown';
        }
        
        card.innerHTML = `
            <div class="comment-header">
                <div class="user-info">
                    <img src="${result.avatar || 'https://via.placeholder.com/40'}" alt="Avatar" class="avatar">
                    <span class="nickname">${result.nickname} (@${result.unique_id})</span>
                </div>
                <div class="likes-info">
                    <i class="fas fa-heart"></i> ${result.likes || 0}
                </div>
            </div>
            <div class="comment-text">${result.text}</div>
            <div class="comment-footer">
                <span class="emotion ${result.emotion.toLowerCase().replace(' ', '_')}">
                    <i class="fas ${emotionIcon}"></i>
                    Cảm xúc: ${result.emotion}
                </span>
                <span class="conclusion">Kết luận: ${result.conclusion}</span>
                ${result.flagged ? `<span class="flag-reason"><i class="fas fa-exclamation-triangle"></i> ${result.flag_reason}</span>` : ''}
            </div>
        `;
        
        container.appendChild(card);
    }
    
    // Function to show moderation summary
    function showModerationSummary(flaggedComments, totalComments) {
        // Create a summary card at the top of the results
        const summaryCard = document.createElement('div');
        summaryCard.className = 'comment-card moderation-summary';
        
        const percentage = Math.round((flaggedComments.length / totalComments) * 100);
        
        summaryCard.innerHTML = `
            <div class="moderation-header">
                <i class="fas fa-shield-alt"></i>
                <h3>Báo Cáo Kiểm Duyệt</h3>
            </div>
            <div class="moderation-content">
                <p><strong>${flaggedComments.length}</strong> trên <strong>${totalComments}</strong> bình luận (${percentage}%) đã bị gắn cờ vì vi phạm.</p>
                <div class="moderation-categories">
                    <h4>Các lý do gắn cờ:</h4>
                    <ul>
                        ${getCategoryBreakdown(flaggedComments)}
                    </ul>
                </div>
                <div class="moderation-actions">
                    <button class="action-btn" id="highlight-flagged-btn">
                        <i class="fas fa-search"></i> Cuộn đến bình luận gắn cờ
                    </button>
                    <button class="action-btn" id="export-flagged-btn">
                        <i class="fas fa-file-export"></i> Xuất báo cáo gắn cờ
                    </button>
                </div>
            </div>
        `;
        
        // Insert at the beginning of results
        resultsDiv.insertBefore(summaryCard, resultsDiv.firstChild);
        
        // Add event listeners to the new buttons
        document.getElementById('highlight-flagged-btn').addEventListener('click', () => {
            highlightFlaggedComments();
        });
        
        document.getElementById('export-flagged-btn').addEventListener('click', () => {
            exportFlaggedComments(flaggedComments);
        });
    }
    
    // Function to get category breakdown
    function getCategoryBreakdown(flaggedComments) {
        // Analyze flag reasons to create categories
        const categories = {};
        
        flaggedComments.forEach(comment => {
            const reason = comment.flag_reason.toLowerCase();
            
            // Look for common violation types in the reason text
            if (reason.includes('ngôn từ thù ghét') || reason.includes('thù ghét')) {
                categories['Ngôn từ thù ghét'] = (categories['Ngôn từ thù ghét'] || 0) + 1;
            } else if (reason.includes('gợi dục') || reason.includes('tình dục')) {
                categories['Nội dung gợi dục'] = (categories['Nội dung gợi dục'] || 0) + 1;
            } else if (reason.includes('lăng mạ') || reason.includes('xúc phạm')) {
                categories['Lăng mạ/Xúc phạm'] = (categories['Lăng mạ/Xúc phạm'] || 0) + 1;
            } else if (reason.includes('bạo lực')) {
                categories['Bạo lực'] = (categories['Bạo lực'] || 0) + 1;
            } else if (reason.includes('đe dọa')) {
                categories['Đe dọa'] = (categories['Đe dọa'] || 0) + 1;
            } else {
                categories['Vi phạm khác'] = (categories['Vi phạm khác'] || 0) + 1;
            }
        });
        
        // Generate HTML list items
        let categoryHtml = '';
        for (const [category, count] of Object.entries(categories)) {
            categoryHtml += `<li><span class="category-name">${category}</span>: <span class="category-count">${count}</span></li>`;
        }
        
        return categoryHtml || '<li>Không thể phân loại lý do</li>';
    }
    
    // Function to highlight and scroll to flagged comments
    function highlightFlaggedComments() {
        const flaggedCards = document.querySelectorAll('.comment-card.flagged');
        
        if (flaggedCards.length === 0) {
            showNotification('Không tìm thấy bình luận nào bị gắn cờ', 'info');
            return;
        }
        
        // Remove previous highlights
        document.querySelectorAll('.highlight-pulse').forEach(el => {
            el.classList.remove('highlight-pulse');
        });
        
        // Add highlight animation class to flagged comments
        flaggedCards.forEach(card => {
            card.classList.add('highlight-pulse');
        });
        
        // Scroll to the first flagged comment
        flaggedCards[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Start a timer to cycle through flagged comments
        let currentIndex = 0;
        const flaggedScrollInterval = setInterval(() => {
            // Clear highlight from previous comment
            flaggedCards[currentIndex].classList.remove('current-highlight');
            
            // Move to next comment
            currentIndex = (currentIndex + 1) % flaggedCards.length;
            
            // Highlight and scroll to next comment
            flaggedCards[currentIndex].classList.add('current-highlight');
            flaggedCards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // If we've gone through all comments, clear the interval
            if (currentIndex === 0) {
                clearInterval(flaggedScrollInterval);
                
                // Remove the highlight classes after a delay
                setTimeout(() => {
                    document.querySelectorAll('.highlight-pulse, .current-highlight').forEach(el => {
                        el.classList.remove('highlight-pulse', 'current-highlight');
                    });
                }, 2000);
            }
        }, 1500);
    }
    
    // Function to export flagged comments
    function exportFlaggedComments(flaggedComments) {
        if (flaggedComments.length === 0) {
            showNotification('Không có bình luận nào bị gắn cờ để xuất', 'info');
            return;
        }
        
        // Prepare CSV data
        let csvContent = 'Người dùng,Bình luận,Lý do gắn cờ\n';
        
        flaggedComments.forEach(comment => {
            // Escape quotes in text fields
            const user = `"${comment.nickname} (@${comment.unique_id})"`;
            const text = `"${comment.text.replace(/"/g, '""')}"`;
            const reason = `"${comment.flag_reason.replace(/"/g, '""')}"`;
            
            csvContent += `${user},${text},${reason}\n`;
        });
        
        // Create and download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `flagged_comments_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Đã xuất danh sách bình luận bị gắn cờ', 'info');
    }
    
    // Helper function to show notification (copied from script.js for consistency)
    function showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        if (notification && notificationMessage) {
            // Set message and class
            notificationMessage.textContent = message;
            notification.className = `notification ${type}`;
            
            // Add show class to trigger animation
            notification.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }
    
    // Add custom CSS for moderation features
    const style = document.createElement('style');
    style.textContent = `
        .moderation-summary {
            background-color: var(--bg-secondary);
            border-left: 4px solid #ff9800;
            margin-bottom: 25px;
        }
        
        .moderation-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .moderation-header i {
            font-size: 1.5rem;
            color: #ff9800;
        }
        
        .moderation-header h3 {
            margin: 0;
            color: var(--text-primary);
        }
        
        .moderation-content p {
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        
        .moderation-categories {
            background-color: var(--bg-tertiary);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .moderation-categories h4 {
            margin-top: 0;
            margin-bottom: 10px;
            color: var(--text-primary);
        }
        
        .moderation-categories ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .moderation-categories li {
            margin-bottom: 5px;
            color: var(--text-primary);
        }
        
        .category-name {
            font-weight: 600;
        }
        
        .category-count {
            font-weight: 700;
            color: var(--text-accent);
        }
        
        .moderation-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .highlight-pulse {
            animation: pulse-border 2s infinite;
        }
        
        .current-highlight {
            border-left: 5px solid #ff9800;
            animation: pulse-border 0.5s infinite;
        }
        
        @keyframes pulse-border {
            0% {
                box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.5);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(255, 152, 0, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
            }
        }
    `;
    document.head.appendChild(style);
});
