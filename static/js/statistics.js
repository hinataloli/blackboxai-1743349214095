document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts if we're on the statistics page
    if (document.getElementById('statistics')) {
        initCharts();
    }
    
    // Initialize charts function
    function initCharts() {
        // Setup theme based on current mode
        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#e9ecef' : '#343a40';
        const gridColor = isDarkMode ? '#343a40' : '#e9ecef';
        
        // Fetch statistics data
        fetch('/get_statistics')
            .then(response => response.json())
            .then(stats => {
                // Only create charts if we have data
                if (stats.total_comments > 0) {
                    createSentimentPieChart(stats, textColor);
                    createCommentersBarChart(stats, textColor, gridColor);
                    createWordCloud(stats);
                }
            })
            .catch(error => {
                console.error('Error fetching statistics:', error);
                showNotification('Không thể tải dữ liệu thống kê', 'error');
            });
    }
    
    // Create Sentiment Distribution Pie Chart
    function createSentimentPieChart(stats, textColor) {
        const ctx = document.getElementById('sentimentPieChart');
        if (!ctx) return;
        
        const sentimentData = stats.sentiment_distribution || {};
        
        // Extract data
        const labels = Object.keys(sentimentData);
        const data = Object.values(sentimentData);
        
        // Set colors based on sentiment
        const colors = labels.map(label => {
            if (label.includes('Tích cực')) return '#08d9d6';
            if (label.includes('Tiêu cực')) return '#ff2e63';
            return '#adb5bd';
        });
        
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor,
                            font: {
                                family: 'Poppins',
                                size: 14
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }
    
    // Create Top Commenters Bar Chart
    function createCommentersBarChart(stats, textColor, gridColor) {
        const ctx = document.getElementById('commentersBarChart');
        if (!ctx) return;
        
        const commentersData = stats.top_commenters || {};
        
        // Extract data and sort by count
        const sortedEntries = Object.entries(commentersData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Take top 5
        
        const labels = sortedEntries.map(entry => entry[0]);
        const data = sortedEntries.map(entry => entry[1]);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số bình luận',
                    data: data,
                    backgroundColor: '#ff2e63',
                    borderColor: '#ff2e63',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bar chart
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.raw} bình luận`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            precision: 0 // Only show integers
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Poppins'
                            },
                            callback: function(value, index) {
                                // Truncate long usernames
                                const label = this.getLabelForValue(value);
                                return label.length > 15 ? label.substring(0, 15) + '...' : label;
                            }
                        }
                    }
                },
                animation: {
                    delay: function(context) {
                        return context.dataIndex * 100;
                    }
                }
            }
        });
    }
    
    // Create Word Cloud
    function createWordCloud(stats) {
        const wordCloudContainer = document.getElementById('wordCloud');
        if (!wordCloudContainer || !stats.common_words) return;
        
        // Clear previous word cloud if any
        wordCloudContainer.innerHTML = '';
        
        const wordsData = stats.common_words || {};
        
        // Convert to array of { text, size } objects
        const words = Object.entries(wordsData).map(([text, count]) => ({
            text,
            size: calculateFontSize(count, Object.values(wordsData))
        }));
        
        // Set colors based on current theme
        const isDarkMode = document.body.classList.contains('dark-mode');
        const defaultColor = isDarkMode ? '#e9ecef' : '#343a40';
        
        // Set dimensions
        const width = wordCloudContainer.offsetWidth;
        const height = 300;
        
        // Create SVG
        const svg = d3.select('#wordCloud')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);
        
        // Create word cloud layout
        const layout = d3.layout.cloud()
            .size([width, height])
            .words(words)
            .padding(5)
            .rotate(() => ~~(Math.random() * 2) * 90)
            .fontSize(d => d.size)
            .on('end', draw);
        
        layout.start();
        
        // Draw the word cloud
        function draw(words) {
            svg.selectAll('text')
                .data(words)
                .enter()
                .append('text')
                .style('font-family', 'Poppins')
                .style('fill', function(d) {
                    // Assign colors based on font size (importance)
                    if (d.size > 25) return '#ff2e63'; // Most important
                    if (d.size > 20) return '#08d9d6'; // Medium important
                    return defaultColor; // Less important
                })
                .style('font-size', d => `${d.size}px`)
                .attr('text-anchor', 'middle')
                .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
                .text(d => d.text)
                .on('mouseover', function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('font-size', d => `${d.size * 1.2}px`)
                        .style('cursor', 'pointer')
                        .style('fill', '#ff2e63');
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('font-size', d => `${d.size}px`)
                        .style('fill', function(d) {
                            if (d.size > 25) return '#ff2e63';
                            if (d.size > 20) return '#08d9d6';
                            return defaultColor;
                        });
                });
        }
        
        // Helper function to calculate font size
        function calculateFontSize(count, allCounts) {
            const minCount = Math.min(...allCounts);
            const maxCount = Math.max(...allCounts);
            const minFontSize = 12;
            const maxFontSize = 32;
            
            if (minCount === maxCount) return (minFontSize + maxFontSize) / 2;
            
            return minFontSize + ((count - minCount) / (maxCount - minCount)) * (maxFontSize - minFontSize);
        }
    }
    
    // Export statistics buttons
    document.querySelectorAll('[id^="export-stats-"]').forEach(button => {
        button.addEventListener('click', function() {
            const format = this.id.replace('export-stats-', '');
            exportStatistics(format);
        });
    });
    
    // Function to export statistics
    function exportStatistics(format) {
        if (format === 'csv' || format === 'json') {
            // Server-side export
            fetch("/export", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ "export_type": format })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showNotification(data.error, 'error');
                    return;
                }
                
                // Download file
                const blob = new Blob([data.data], { type: `text/${format}` });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `tiktok_statistics_${Date.now()}.${format}`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                showNotification(`Xuất dữ liệu ${format.toUpperCase()} thành công!`);
            })
            .catch(error => {
                console.error("Export error:", error);
                showNotification(`Lỗi khi xuất dữ liệu: ${error.message}`, 'error');
            });
        } else if (format === 'pdf') {
            // Use export.js for PDF generation
            window.exportStatisticsToPDF();
        } else if (format === 'image') {
            // Capture the charts as an image
            html2canvas(document.querySelector('.charts-container')).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = imgData;
                a.download = `tiktok_statistics_${Date.now()}.png`;
                a.click();
                
                showNotification('Xuất hình ảnh thành công!');
            });
        }
    }
    
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
