document.addEventListener('DOMContentLoaded', function() {
    // Add html2canvas and jsPDF scripts dynamically
    const html2canvasScript = document.createElement('script');
    html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(html2canvasScript);
    
    const jsPDFScript = document.createElement('script');
    jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(jsPDFScript);
    
    // Generate PDF of comments results
    window.generatePDF = function() {
        // Wait for scripts to load
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            setTimeout(generatePDF, 500);
            return;
        }
        
        const { jsPDF } = window.jspdf;
        
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) {
            showNotification('Không có kết quả để xuất', 'error');
            return;
        }
        
        // Show loading notification
        showNotification('Đang tạo PDF, vui lòng đợi...');
        
        // Get current date for filename
        const date = new Date().toISOString().slice(0, 10);
        const filename = `tiktok_comments_${date}.pdf`;
        
        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Add title
        pdf.setTextColor(255, 46, 99);
        pdf.setFontSize(22);
        pdf.text('Phân Tích Bình Luận TikTok', 105, 20, { align: 'center' });
        
        // Add date
        pdf.setFontSize(12);
        pdf.setTextColor(108, 117, 125);
        pdf.text(`Tạo ngày: ${new Date().toLocaleString('vi-VN')}`, 105, 30, { align: 'center' });
        
        // Generate a table of comments
        const commentsData = [];
        const commentCards = resultsDiv.querySelectorAll('.comment-card:not(.loading-state)');
        
        // Header row
        commentsData.push(['Người dùng', 'Bình luận', 'Cảm xúc']);
        
        // Add each comment
        commentCards.forEach(card => {
            const nickname = card.querySelector('.nickname').textContent;
            const text = card.querySelector('.comment-text').textContent;
            const emotion = card.querySelector('.emotion').textContent.replace('Cảm xúc: ', '');
            
            commentsData.push([nickname, text, emotion]);
        });
        
        // Generate the table
        pdf.autoTable({
            startY: 40,
            head: [commentsData[0]],
            body: commentsData.slice(1),
            headStyles: {
                fillColor: [255, 46, 99],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            styles: {
                overflow: 'linebreak',
                fontSize: 10
            },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 30 }
            }
        });
        
        // Save the PDF
        pdf.save(filename);
        
        // Show success notification
        showNotification('Xuất PDF thành công!');
    };
    
    // Export statistics to PDF
    window.exportStatisticsToPDF = function() {
        // Wait for scripts to load
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            setTimeout(exportStatisticsToPDF, 500);
            return;
        }
        
        const { jsPDF } = window.jspdf;
        
        // Show loading notification
        showNotification('Đang tạo PDF, vui lòng đợi...');
        
        // Get elements to include in PDF
        const chartsContainer = document.querySelector('.charts-container');
        const statsSummary = document.querySelector('.stats-summary');
        
        if (!chartsContainer || !statsSummary) {
            showNotification('Không có thống kê để xuất', 'error');
            return;
        }
        
        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Add title
        pdf.setTextColor(255, 46, 99);
        pdf.setFontSize(22);
        pdf.text('Thống Kê Bình Luận TikTok', 105, 20, { align: 'center' });
        
        // Add date
        pdf.setFontSize(12);
        pdf.setTextColor(108, 117, 125);
        pdf.text(`Tạo ngày: ${new Date().toLocaleString('vi-VN')}`, 105, 30, { align: 'center' });
        
        // First capture the stats summary
        html2canvas(statsSummary, { scale: 2, backgroundColor: null }).then(summaryCanvas => {
            // Add stats summary to PDF
            const summaryImgData = summaryCanvas.toDataURL('image/png');
            const summaryImgProps = pdf.addImage(summaryImgData, 'PNG', 10, 40, 190, 40);
            
            // Now capture the charts container
            html2canvas(chartsContainer, { scale: 2, backgroundColor: null }).then(chartsCanvas => {
                // Add charts to PDF
                const chartsImgData = chartsCanvas.toDataURL('image/png');
                pdf.addImage(chartsImgData, 'PNG', 10, 85, 190, 190);
                
                // Save the PDF
                pdf.save(`tiktok_statistics_${Date.now()}.pdf`);
                
                // Show success notification
                showNotification('Xuất PDF thành công!');
            });
        });
    };
    
    // Helper function to show notification
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
});
