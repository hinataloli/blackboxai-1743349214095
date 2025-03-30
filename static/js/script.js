document.addEventListener('DOMContentLoaded', function() {
    // Load saved chat from cookie
    const savedChat = loadChatFromCookie();
    if (savedChat && savedChat.length > 0) {
        savedChat.forEach(msg => {
            if (msg.type && msg.content) {
                addMessage(msg.type, msg.content);
            }
        });
    }
    
    // New chat button handler
    document.getElementById('new-chat-btn').addEventListener('click', createNewChat);
    // Elements
    const landingSection = document.getElementById('landing');
    const analyzerSection = document.getElementById('analyzer');
    const chatSection = document.getElementById('chat');
    
    const analyzeBtn = document.getElementById('analyze-btn');
    const chatBtn = document.getElementById('chat-btn');
    
    const backToLandingFromAnalyzer = document.getElementById('back-to-landing-from-analyzer');
    const backToLandingFromChat = document.getElementById('back-to-landing-from-chat');
    
    const analyzerForm = document.getElementById('analyzer-form');
    const chatForm = document.getElementById('chat-form');
    
    const resultsDiv = document.getElementById('results');
    const chatOutputPanel = document.getElementById('chat-output-panel');
    
    const filterDropdownBtn = document.querySelector('.dropdown-btn[data-dropdown="filter"]');
    const exportDropdownBtn = document.querySelector('.dropdown-btn[data-dropdown="export"]');
    const viewStatsBtn = document.getElementById('view-stats-btn');
    const clearResultsBtn = document.getElementById('clear-results-btn');
    
    const saveChatBtn = document.getElementById('save-chat-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    
    const filterLinks = document.querySelectorAll('[data-filter]');
    const exportLinks = document.querySelectorAll('[data-export]');
    
    // Section Navigation
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            landingSection.style.display = 'none';
            analyzerSection.style.display = 'block';
        });
    }
    
    if (chatBtn) {
        chatBtn.addEventListener('click', function() {
            landingSection.style.display = 'none';
            chatSection.style.display = 'block';
        });
    }
    
    if (backToLandingFromAnalyzer) {
        backToLandingFromAnalyzer.addEventListener('click', function() {
            analyzerSection.style.display = 'none';
            landingSection.style.display = 'flex';
        });
    }
    
    if (backToLandingFromChat) {
        backToLandingFromChat.addEventListener('click', function() {
            chatSection.style.display = 'none';
            landingSection.style.display = 'flex';
        });
    }
    
    // Dropdown handlers
    document.querySelectorAll('.dropdown-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Close all other dropdowns first
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                if (dropdown !== this.closest('.dropdown')) {
                    dropdown.classList.remove('active');
                }
            });
            
            // Toggle current dropdown
            this.closest('.dropdown').classList.toggle('active');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
    
    // Form Submission Handlers
    if (analyzerForm) {
        analyzerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const videoId = document.querySelector("input[name='video_id']").value;
            const moderateContent = document.getElementById('moderate-content').checked;
            
            // Show loading state
            resultsDiv.innerHTML = `
                <div class="comment-card loading-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p>Đang phân tích bình luận...</p>
                    </div>
                </div>
            `;
            
            fetch("/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ 
                    "video_id": videoId,
                    "moderate": moderateContent
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
                
                // Create elements for each comment with staggered animation
                data.forEach((result, index) => {
                    setTimeout(() => {
                        createCommentCard(result, resultsDiv);
                    }, index * 100);
                });
                
                // Show notification
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
        });
    }
    
    // Filter handlers
    if (filterLinks) {
        filterLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const filterType = this.getAttribute('data-filter');
                
                if (filterType === 'all') {
                    // Show original results
                    fetch("/analyze", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({ "video_id": document.querySelector("input[name='video_id']").value })
                    })
                    .then(response => response.json())
                    .then(data => {
                        displayFilteredResults(data);
                    });
                } else {
                    // Apply filter
                    fetch("/filter", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({ "filter_type": filterType })
                    })
                    .then(response => response.json())
                    .then(data => {
                        displayFilteredResults(data);
                    });
                }
                
                // Hide dropdown
                document.querySelectorAll('.dropdown').forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            });
        });
    }
    
    // Export handlers
    if (exportLinks) {
        exportLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const exportType = this.getAttribute('data-export');
                
                fetch("/export", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ "export_type": exportType })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showNotification(data.error, 'error');
                        return;
                    }
                    
                    if (exportType === 'pdf') {
                        // Let export.js handle PDF generation
                        generatePDF();
                    } else {
                        // Download file
                        downloadData(data.data, exportType, `tiktok_comments_${Date.now()}.${exportType}`);
                    }
                    
                    showNotification(`Xuất dữ liệu ${exportType.toUpperCase()} thành công!`);
                })
                .catch(error => {
                    console.error("Export error:", error);
                    showNotification(`Lỗi khi xuất dữ liệu: ${error.message}`, 'error');
                });
                
                // Hide dropdown
                document.querySelectorAll('.dropdown').forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            });
        });
    }
    
    // View Stats button
    if (viewStatsBtn) {
        viewStatsBtn.addEventListener('click', function() {
            window.location.href = '/statistics';
        });
    }
    
    // Clear Results button
    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', function() {
            if (confirm('Bạn có chắc chắn muốn xóa tất cả kết quả phân tích?')) {
                fetch("/clear_results", {
                    method: "POST"
                })
                .then(response => response.json())
                .then(data => {
                    resultsDiv.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-comment-slash"></i>
                            <p>Chưa có bình luận nào được phân tích</p>
                        </div>`;
                    showNotification('Đã xóa tất cả kết quả phân tích!');
                });
            }
        });
    }
    
    // Chat form handler
    if (chatForm) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const queryTextarea = document.getElementById('chat-textarea');
            const query = queryTextarea.value;
            
            if (!query.trim()) {
                return;
            }
            
            // Add user message
            addMessage('user', query);
            
            // Scroll to the latest message
            chatOutputPanel.scrollTop = chatOutputPanel.scrollHeight;
            
            // Clear the textarea
            queryTextarea.value = "";
            
            // Create a new message element for AI response with a typing indicator
            const aiMessageId = `ai-message-${Date.now()}`;
            const aiMessageElement = document.createElement('div');
            aiMessageElement.className = 'message ai-message';
            aiMessageElement.innerHTML = `
                <div class="message-avatar ai-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content" id="${aiMessageId}">
                    <div class="typing-indicator"><span></span><span></span><span></span></div>
                </div>
            `;
            chatOutputPanel.appendChild(aiMessageElement);
            
            // Scroll to the typing indicator
            chatOutputPanel.scrollTop = chatOutputPanel.scrollHeight;
            
            // Use streaming for AI response
            const eventSource = new EventSource(`/ask_ai?ai_query=${encodeURIComponent(query)}&save_history=true&stream=true`);
            
            let fullResponse = '';
            const messageContent = document.getElementById(aiMessageId);
            
            eventSource.onmessage = function(event) {
                if (event.data === '[DONE]') {
                    // End of stream
                    eventSource.close();
                    
                    // Update saved chats list
                    updateSavedChatsList();
                    return;
                }
                
                try {
                    const data = JSON.parse(event.data);
                    
                    // Add new chunk to the message
                    if (data.chunk) {
                        fullResponse = data.full;
                        
                        // Remove typing indicator on first chunk
                        if (messageContent.querySelector('.typing-indicator')) {
                            messageContent.innerHTML = '';
                        }
                        
                        // Format and display the full response so far
                        messageContent.innerHTML = formatAIResponse(fullResponse);
                        
                        // Scroll to the latest content
                        chatOutputPanel.scrollTop = chatOutputPanel.scrollHeight;
                    }
                } catch (error) {
                    console.error('Error parsing streaming response:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                // Close the connection on error
                eventSource.close();
                
                // Remove typing indicator and show error
                if (messageContent.querySelector('.typing-indicator')) {
                    messageContent.innerHTML = `<p class="error-message">Lỗi: Không thể kết nối đến server.</p>`;
                } else {
                    messageContent.innerHTML += `<p class="error-message">Kết nối bị ngắt.</p>`;
                }
                
                console.error('EventSource error:', error);
            };
        });
    }
    
    // Save Chat button
    if (saveChatBtn) {
        saveChatBtn.addEventListener('click', function() {
            showNotification('Cuộc trò chuyện đã được lưu!');
        });
    }
    
    // Clear Chat button
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', function() {
            if (confirm('Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện?')) {
                fetch("/clear_chat", {
                    method: "POST"
                })
                .then(response => response.json())
                .then(data => {
                    // Clear chat panel
                    chatOutputPanel.innerHTML = `
                        <div class="message ai-message">
                            <div class="message-avatar ai-avatar"><i class="fas fa-robot"></i></div>
                            <div class="message-content">
                                <p>Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn hôm nay?</p>
                            </div>
                        </div>`;
                    
                    // Clear saved chats list
                    document.getElementById('saved-chats-list').innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-comment-slash"></i>
                            <p>Chưa có cuộc trò chuyện nào được lưu</p>
                        </div>`;
                    
                    showNotification('Đã xóa toàn bộ cuộc trò chuyện!');
                });
            }
        });
    }
    
    // Saved chat items click handler
    document.addEventListener('click', function(e) {
        const savedChatItem = e.target.closest('.saved-chat-item');
        if (savedChatItem) {
            const chatId = savedChatItem.getAttribute('data-id');
            // Scroll to the relevant chat in the output panel
            // In a real implementation, you would fetch the specific chat or scroll to its ID
            chatOutputPanel.scrollTop = 0;
            
            // Add highlight effect
            savedChatItem.classList.add('highlight');
            setTimeout(() => {
                savedChatItem.classList.remove('highlight');
            }, 1000);
        }
    });
    
    // Helper Functions
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
    
    function displayFilteredResults(data) {
        resultsDiv.innerHTML = "";
        
        if (data.length === 0) {
            resultsDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <p>Không có bình luận nào khớp với bộ lọc.</p>
                </div>`;
            return;
        }
        
        data.forEach(result => {
            createCommentCard(result, resultsDiv);
        });
        
        showNotification(`Đang hiển thị ${data.length} bình luận.`);
    }
    
    function formatAIResponse(text) {
        // Basic Markdown formatting
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
        text = text.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>'); // Code blocks
        text = text.replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code
        text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>'); // H1
        text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>'); // H2
        text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>'); // H3
        
        // Convert line breaks to <br>
        text = text.replace(/\n/g, '<br>');
        
        // Handle bullet points
        text = text.replace(/- (.*)/g, '<li>$1</li>');
        text = text.replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>');
        text = text.replace(/<\/ul><ul>/g, '');
        
        return text;
    }
    
    // Handle keyboard shortcuts 
document.getElementById('chat-textarea').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const form = document.getElementById('chat-form');
        if (form && !form.hasAttribute('data-submitting')) {
            form.setAttribute('data-submitting', 'true');
            form.dispatchEvent(new Event('submit'));
            setTimeout(() => form.removeAttribute('data-submitting'), 100);
        }
    }
});

// Create new chat
function createNewChat() {
    chatOutputPanel.innerHTML = `
        <div class="message ai-message">
            <div class="message-avatar ai-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <p>Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn hôm nay?</p>
            </div>
        </div>
    `;
    saveChatToCookie([]); 
}

// Save chat to cookie
function saveChatToCookie(messages) {
    try {
        const chatHistory = JSON.stringify(messages);
        const date = new Date();
        date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
        document.cookie = `chatHistory=${encodeURIComponent(chatHistory)};path=/;expires=${date.toUTCString()}`;
        return true;
    } catch (error) {
        console.error('Error saving chat:', error);
        return false;
    }
}

// Load chat from cookie
function loadChatFromCookie() {
    const cookies = document.cookie.split(';');
    const chatCookie = cookies.find(c => c.trim().startsWith('chatHistory='));
    if (chatCookie) {
        return JSON.parse(decodeURIComponent(chatCookie.split('=')[1]));
    }
    return [];
}

function addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        let avatar;
        if (type === 'user') {
            avatar = '<div class="message-avatar user-avatar"><i class="fas fa-user"></i></div>';
        } else {
            avatar = '<div class="message-avatar ai-avatar"><i class="fas fa-robot"></i></div>';
        }
        
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-content">${content}</div>
        `;
        
        chatOutputPanel.appendChild(messageDiv);
    }
    
    function showLoadingMessage() {
        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message';
        loadingDiv.id = loadingId;
        
        loadingDiv.innerHTML = `
            <div class="message-avatar ai-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <p>
                    <i class="fas fa-spinner fa-spin"></i>
                    AI đang suy nghĩ...
                </p>
            </div>
        `;
        
        chatOutputPanel.appendChild(loadingDiv);
        return loadingId;
    }
    
    function removeLoadingMessage(loadingId) {
        const loadingMessage = document.getElementById(loadingId);
        if (loadingMessage) {
            chatOutputPanel.removeChild(loadingMessage);
        }
    }
    
    function addErrorMessage(errorText) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error-message';
        
        errorDiv.innerHTML = `
            <div class="message-avatar ai-avatar"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="message-content">
                <p>${errorText}</p>
            </div>
        `;
        
        chatOutputPanel.appendChild(errorDiv);
    }
    
    function updateSavedChatsList() {
        const savedChatsList = document.getElementById('saved-chats-list');
        
        // In a real implementation, you would fetch the updated list from the server
        // This is a simplified version that simulates adding a new chat entry
        
        // Check if there's an empty state message and remove it
        const emptyState = savedChatsList.querySelector('.empty-state');
        if (emptyState) {
            savedChatsList.removeChild(emptyState);
        }
        
        // Create a new saved chat item
        const newChatItem = document.createElement('div');
        newChatItem.className = 'saved-chat-item';
        newChatItem.setAttribute('data-id', 'chat_' + Date.now());
        
        // Get the last user message
        const lastUserMessage = document.querySelector('.user-message:last-child .message-content').textContent;
        
        newChatItem.innerHTML = `
            <div class="saved-chat-preview">
                <p class="saved-chat-query">${lastUserMessage.length > 30 ? lastUserMessage.substring(0, 30) + '...' : lastUserMessage}</p>
                <span class="saved-chat-time">${new Date().toLocaleString()}</span>
            </div>
        `;
        
        // Add to the list
        savedChatsList.insertBefore(newChatItem, savedChatsList.firstChild);
    }
    
    function downloadData(data, type, filename) {
        const blob = new Blob([data], { type: `text/${type}` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
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
    
    // Add loading indicators and animations when the page loads
    window.addEventListener('load', function() {
        // Simulate a loading sequence
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 500);
    });
});
