document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check for saved theme preference or respect OS preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply theme based on saved preference or OS preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkMode)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Toggle theme when button is clicked
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            // Toggle dark mode class
            document.body.classList.toggle('dark-mode');
            
            // Save preference to localStorage
            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                updateChartTheme('dark');
            } else {
                localStorage.setItem('theme', 'light');
                updateChartTheme('light');
            }
        });
    }
    
    // Update chart theme if charts are present
    updateChartTheme(document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    
    // Function to update Chart.js theme
    function updateChartTheme(theme) {
        // Only proceed if Chart is defined (charts are on the page)
        if (typeof Chart !== 'undefined') {
            // Set Chart.js default colors based on theme
            const textColor = theme === 'dark' ? '#e9ecef' : '#343a40';
            const gridColor = theme === 'dark' ? '#343a40' : '#e9ecef';
            
            Chart.defaults.color = textColor;
            Chart.defaults.borderColor = gridColor;
            
            // Update any existing charts
            // Note: Chart.instances is not available in newer versions of Chart.js
            // Instead, we'll update charts when they're created in the statistics.js file
            if (Chart.getChart) { // Check if this method exists (Chart.js v3+)
                const chartIds = ['sentimentPieChart', 'commentersBarChart'];
                chartIds.forEach(id => {
                    const chart = Chart.getChart(id);
                    if (chart) {
                        // Update grid lines
                        if (chart.config.options.scales && chart.config.options.scales.x) {
                            chart.config.options.scales.x.grid.color = gridColor;
                            chart.config.options.scales.x.ticks.color = textColor;
                        }
                        
                        if (chart.config.options.scales && chart.config.options.scales.y) {
                            chart.config.options.scales.y.grid.color = gridColor;
                            chart.config.options.scales.y.ticks.color = textColor;
                        }
                        
                        // Update legend
                        if (chart.config.options.plugins && chart.config.options.plugins.legend) {
                            chart.config.options.plugins.legend.labels.color = textColor;
                        }
                        
                        chart.update();
                    }
                });
            }
        }
        
        // Update WordCloud if it exists
        updateWordCloudTheme(theme);
    }
    
    function updateWordCloudTheme(theme) {
        const wordCloudElement = document.getElementById('wordCloud');
        
        if (wordCloudElement && typeof d3 !== 'undefined') {
            // Get any existing word cloud
            const existingSvg = d3.select('#wordCloud svg');
            
            if (!existingSvg.empty()) {
                // Update text colors
                existingSvg.selectAll('text')
                    .style('fill', function() {
                        // Keep color-coded words, but update neutral colored words
                        const currentColor = d3.select(this).style('fill');
                        if (currentColor === '#343a40' || currentColor === '#e9ecef') {
                            return theme === 'dark' ? '#e9ecef' : '#343a40';
                        }
                        return currentColor;
                    });
            }
        }
    }
    
    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        // Only apply OS preference if user hasn't set a preference
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.body.classList.add('dark-mode');
                updateChartTheme('dark');
            } else {
                document.body.classList.remove('dark-mode');
                updateChartTheme('light');
            }
        }
    });
});
