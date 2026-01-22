/**
 * Main Application Controller
 */

class SoundingApp {
    constructor() {
        this.diagram = new SkewTDiagram('skewt');
        this.parser = new SoundingDataParser();

        // UI elements
        this.stationInput = document.getElementById('station');
        this.dateInput = document.getElementById('date');
        this.hourSelect = document.getElementById('hour');
        this.loadBtn = document.getElementById('loadBtn');

        this.minHeightInput = document.getElementById('minHeight');
        this.maxHeightInput = document.getElementById('maxHeight');
        this.zoomBtn = document.getElementById('zoomBtn');
        this.resetZoomBtn = document.getElementById('resetZoomBtn');

        this.infoPanel = document.getElementById('infoPanel');
        this.stationInfo = document.getElementById('stationInfo');
        this.locationInfo = document.getElementById('locationInfo');
        this.timeInfo = document.getElementById('timeInfo');
        this.elevationInfo = document.getElementById('elevationInfo');

        this.loading = document.getElementById('loading');
        this.errorDiv = document.getElementById('error');

        // Cursor info elements
        this.cursorInfo = document.getElementById('cursorInfo');
        this.cursorHeight = document.getElementById('cursorHeight');
        this.cursorTemp = document.getElementById('cursorTemp');
        this.cursorDewpoint = document.getElementById('cursorDewpoint');
        this.cursorWind = document.getElementById('cursorWind');
        this.cursorWindDir = document.getElementById('cursorWindDir');
        this.cursorPressure = document.getElementById('cursorPressure');

        // Store current sounding data for redrawing
        this.currentSoundingData = null;

        this.setupEventListeners();
        this.initializeDate();
        this.loadInitialData();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.loadBtn.addEventListener('click', () => this.loadSounding());

        // Allow Enter key to load
        this.stationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadSounding();
        });

        // Zoom controls
        this.zoomBtn.addEventListener('click', () => this.applyZoom());
        this.resetZoomBtn.addEventListener('click', () => this.resetZoom());

        // Allow Enter key in height inputs
        this.minHeightInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyZoom();
        });
        this.maxHeightInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyZoom();
        });

        // Canvas mouse tracking
        this.diagram.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.diagram.canvas.addEventListener('mouseleave', () => this.hideCursorInfo());
    }

    /**
     * Initialize date input to today
     */
    initializeDate() {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        this.dateInput.value = `${year}-${month}-${day}`;
    }

    /**
     * Load initial data from URL or default
     */
    async loadInitialData() {
        // Check if there's a URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const station = urlParams.get('station') || this.stationInput.value;
        const date = urlParams.get('date') || this.dateInput.value;
        const hour = urlParams.get('hour') || this.hourSelect.value;

        this.stationInput.value = station;
        this.dateInput.value = date;
        this.hourSelect.value = hour;

        await this.loadSounding();
    }

    /**
     * Build URL for UW Wyoming data
     */
    buildDataURL(station, date, hour) {
        // Format: https://weather.uwyo.edu/wsgi/sounding?datetime=YYYY-MM-DD HH:00:00&id=STATION&src=BUFR&type=TEXT:LIST
        const dateTime = `${date} ${hour}:00:00`;
        const params = new URLSearchParams({
            datetime: dateTime,
            id: station,
            src: 'BUFR',
            type: 'TEXT:LIST'
        });

        return `https://weather.uwyo.edu/wsgi/sounding?${params.toString()}`;
    }

    /**
     * Fetch sounding data with timeout
     */
    async fetchData(url) {
        const timeout = 30000; // 30 second timeout

        // Helper to create timeout promise
        const fetchWithTimeout = (fetchUrl, timeoutMs) => {
            return Promise.race([
                fetch(fetchUrl),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
                )
            ]);
        };

        // Try direct fetch first (may fail due to CORS)
        try {
            const response = await fetchWithTimeout(url, timeout);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.log('Direct fetch failed, trying CORS proxy...');

            // Try first CORS proxy
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const response = await fetchWithTimeout(proxyUrl, timeout);
                if (!response.ok) {
                    throw new Error(`Proxy returned ${response.status}`);
                }
                return await response.text();
            } catch (proxyError) {
                // Try alternative CORS proxy
                console.log('First proxy failed, trying alternative...');
                try {
                    const altProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                    const response = await fetchWithTimeout(altProxyUrl, timeout);
                    if (!response.ok) {
                        throw new Error(`Alternative proxy returned ${response.status}`);
                    }
                    return await response.text();
                } catch (altError) {
                    throw new Error('Data unavailable. Try: (1) Use yesterday\'s date, (2) Try a different station, or (3) Check if data exists for this date/time.');
                }
            }
        }
    }

    /**
     * Load and display sounding
     */
    async loadSounding() {
        const station = this.stationInput.value.trim();
        const date = this.dateInput.value;
        const hour = this.hourSelect.value;

        if (!station || !date) {
            this.showError('Please enter a station ID and date');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            // Build URL
            const url = this.buildDataURL(station, date, hour);
            console.log('Fetching:', url);

            // Fetch data
            const rawData = await this.fetchData(url);

            // Parse data
            const result = this.parser.parse(rawData);

            if (!result.valid || result.data.length === 0) {
                throw new Error('No valid sounding data found. Check station ID and date.');
            }

            console.log('Parsed data:', result);

            // Store sounding data
            this.currentSoundingData = result;

            // Update info panel
            this.updateInfoPanel(result.metadata, station, date, hour);

            // Reset zoom to data range
            this.resetZoomToDataRange(result);

            // Draw diagram
            this.diagram.draw(result);

            this.showLoading(false);

        } catch (error) {
            console.error('Error loading sounding:', error);
            let errorMessage = error.message || 'Failed to load sounding data.';

            // Add helpful suggestions
            if (errorMessage.includes('timeout') || errorMessage.includes('unavailable') || errorMessage.includes('408')) {
                errorMessage += ' Suggestions: Try using yesterday\'s date, a different time (12 UTC), or verify the station has data for this period.';
            }

            this.showError(errorMessage);
            this.showLoading(false);
        }
    }

    /**
     * Update information panel
     */
    updateInfoPanel(metadata, station, date, hour) {
        this.stationInfo.textContent = metadata.stationName || station;

        if (metadata.latitude && metadata.longitude) {
            this.locationInfo.textContent = `${metadata.latitude.toFixed(2)}°, ${metadata.longitude.toFixed(2)}°`;
        } else {
            this.locationInfo.textContent = 'N/A';
        }

        // Convert UTC time to local time
        const localTimeStr = this.convertUTCToLocal(date, hour);
        this.timeInfo.textContent = localTimeStr;

        if (metadata.elevation) {
            this.elevationInfo.textContent = `${metadata.elevation} m`;
        } else {
            this.elevationInfo.textContent = 'N/A';
        }

        this.infoPanel.classList.add('active');
    }

    /**
     * Convert UTC date/time to local time string
     */
    convertUTCToLocal(date, hour) {
        try {
            // Parse the UTC date and hour
            const utcDateStr = `${date}T${hour}:00:00Z`;
            const utcDate = new Date(utcDateStr);

            // Format local time
            const options = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            };
            const localTimeStr = utcDate.toLocaleString('en-US', options);

            return `${localTimeStr} (${hour}:00 UTC)`;
        } catch (error) {
            // Fallback if parsing fails
            return `${date} ${hour}:00 UTC`;
        }
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        if (show) {
            this.loading.classList.add('active');
            this.loadBtn.disabled = true;
        } else {
            this.loading.classList.remove('active');
            this.loadBtn.disabled = false;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.classList.add('active');
    }

    /**
     * Hide error message
     */
    hideError() {
        this.errorDiv.classList.remove('active');
    }

    /**
     * Reset zoom to default range
     */
    resetZoomToDataRange(result) {
        if (!result || !result.data || result.data.length === 0) return;

        // Find min height in data
        let minH = Infinity;

        result.data.forEach(row => {
            if (!isNaN(row.height)) {
                minH = Math.min(minH, row.height);
            }
        });

        // Round min to nice number
        minH = Math.floor(minH / 100) * 100;

        // Set max to default 4500m
        const maxH = 4500;

        // Update UI
        this.minHeightInput.value = minH;
        this.maxHeightInput.value = maxH;

        // Update diagram
        this.diagram.setHeightRange(minH, maxH);
    }

    /**
     * Apply zoom from UI inputs
     */
    applyZoom() {
        if (!this.currentSoundingData) {
            this.showError('Please load sounding data first');
            return;
        }

        const minH = parseFloat(this.minHeightInput.value);
        const maxH = parseFloat(this.maxHeightInput.value);

        if (isNaN(minH) || isNaN(maxH)) {
            this.showError('Please enter valid height values');
            return;
        }

        if (minH >= maxH) {
            this.showError('Minimum height must be less than maximum height');
            return;
        }

        this.hideError();

        // Update diagram with new height range
        this.diagram.setHeightRange(minH, maxH);
        this.diagram.draw(this.currentSoundingData);
    }

    /**
     * Reset zoom to default
     */
    resetZoom() {
        if (!this.currentSoundingData) return;
        this.resetZoomToDataRange(this.currentSoundingData);
        this.diagram.draw(this.currentSoundingData);
    }

    /**
     * Handle mouse hover over canvas
     */
    handleCanvasHover(event) {
        if (!this.currentSoundingData || !this.currentSoundingData.data) {
            this.hideCursorInfo();
            return;
        }

        // Get canvas bounding rect
        const rect = this.diagram.canvas.getBoundingClientRect();
        const scaleX = this.diagram.canvas.width / rect.width;
        const scaleY = this.diagram.canvas.height / rect.height;

        // Get mouse position relative to canvas
        const canvasX = (event.clientX - rect.left) * scaleX;
        const canvasY = (event.clientY - rect.top) * scaleY;

        // Check if mouse is within the diagram area
        if (canvasX < this.diagram.margin.left ||
            canvasX > this.diagram.margin.left + this.diagram.width ||
            canvasY < this.diagram.margin.top ||
            canvasY > this.diagram.margin.top + this.diagram.height) {
            this.hideCursorInfo();
            return;
        }

        // Convert Y position to height
        const relativeY = canvasY - this.diagram.margin.top;
        const ratio = 1 - (relativeY / this.diagram.height);
        const height = this.diagram.hMin + ratio * (this.diagram.hMax - this.diagram.hMin);

        // Interpolate data at this height
        const data = this.interpolateDataAtHeight(height);

        if (data) {
            this.showCursorInfo(data, event.clientX, event.clientY);
        } else {
            this.hideCursorInfo();
        }
    }

    /**
     * Interpolate sounding data at a specific height
     */
    interpolateDataAtHeight(targetHeight) {
        const data = this.currentSoundingData.data;

        // Find surrounding data points
        for (let i = 0; i < data.length - 1; i++) {
            const lower = data[i];
            const upper = data[i + 1];

            // Data is typically ordered from surface (low height) to top (high height)
            // but could be reversed
            const minH = Math.min(lower.height, upper.height);
            const maxH = Math.max(lower.height, upper.height);

            if (targetHeight >= minH && targetHeight <= maxH) {
                // Linear interpolation
                const ratio = (targetHeight - lower.height) / (upper.height - lower.height);

                return {
                    height: targetHeight,
                    pressure: lower.pressure + ratio * (upper.pressure - lower.pressure),
                    temp: lower.temp + ratio * (upper.temp - lower.temp),
                    dewpoint: lower.dewpoint + ratio * (upper.dewpoint - lower.dewpoint),
                    windSpeed: lower.windSpeed + ratio * (upper.windSpeed - lower.windSpeed),
                    windDir: lower.windDir + ratio * (upper.windDir - lower.windDir)
                };
            }
        }

        // If no interpolation found, try to find closest point
        let closest = null;
        let minDistance = Infinity;

        data.forEach(row => {
            const distance = Math.abs(row.height - targetHeight);
            if (distance < minDistance) {
                minDistance = distance;
                closest = row;
            }
        });

        return closest;
    }

    /**
     * Show cursor info tooltip
     */
    showCursorInfo(data, mouseX, mouseY) {
        // Update values
        this.cursorHeight.textContent = `${Math.round(data.height)} m`;
        this.cursorTemp.textContent = !isNaN(data.temp) ? `${data.temp.toFixed(1)}°C` : 'N/A';
        this.cursorDewpoint.textContent = !isNaN(data.dewpoint) ? `${data.dewpoint.toFixed(1)}°C` : 'N/A';

        // Convert wind speed from m/s to km/h
        const windKmh = data.windSpeed * 3.6;
        this.cursorWind.textContent = !isNaN(data.windSpeed) ? `${windKmh.toFixed(1)} km/h` : 'N/A';

        // Wind direction with cardinal direction
        if (!isNaN(data.windDir)) {
            const cardinalDir = this.getCardinalDirection(data.windDir);
            this.cursorWindDir.textContent = `${Math.round(data.windDir)}° (${cardinalDir})`;
        } else {
            this.cursorWindDir.textContent = 'N/A';
        }

        this.cursorPressure.textContent = !isNaN(data.pressure) ? `${data.pressure.toFixed(1)} mb` : 'N/A';

        // Position tooltip closer to cursor
        const offsetX = 8;
        const offsetY = 8;
        this.cursorInfo.style.left = (mouseX + offsetX) + 'px';
        this.cursorInfo.style.top = (mouseY + offsetY) + 'px';

        // Show tooltip
        this.cursorInfo.classList.add('active');
    }

    /**
     * Hide cursor info tooltip
     */
    hideCursorInfo() {
        this.cursorInfo.classList.remove('active');
    }

    /**
     * Get cardinal direction from degrees
     */
    getCardinalDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                          'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SoundingApp();
});
