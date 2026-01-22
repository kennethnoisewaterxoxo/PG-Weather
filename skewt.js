/**
 * Skew-T Log-P Diagram Renderer
 */

class SkewTDiagram {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Diagram bounds
        this.margin = { top: 50, right: 150, bottom: 50, left: 100 };
        this.width = this.canvas.width - this.margin.left - this.margin.right;
        this.height = this.canvas.height - this.margin.top - this.margin.bottom;

        // Pressure range (hPa)
        this.pMin = 100;
        this.pMax = 1050;

        // Height range (meters) - default full atmosphere
        this.hMin = 0;
        this.hMax = 4500;

        // Temperature range (Celsius)
        this.tMin = -60;
        this.tMax = 50;

        // Skew factor (temperature shift per pressure decade)
        this.skew = 35;

        // Store sounding data for height-pressure conversion
        this.soundingData = null;
    }

    /**
     * Set height range for zooming
     */
    setHeightRange(minHeight, maxHeight) {
        this.hMin = minHeight;
        this.hMax = maxHeight;
    }

    /**
     * Convert height to Y coordinate (linear)
     */
    heightToY(h) {
        const ratio = (h - this.hMin) / (this.hMax - this.hMin);
        return this.margin.top + this.height * (1 - ratio);
    }

    /**
     * Convert pressure to height using sounding data
     */
    pressureToHeight(p) {
        if (!this.soundingData || !this.soundingData.data) {
            // Fallback: use standard atmosphere approximation
            return 44330 * (1 - Math.pow(p / 1013.25, 0.1903));
        }

        const data = this.soundingData.data;

        // Find surrounding pressure levels
        for (let i = 0; i < data.length - 1; i++) {
            if (data[i].pressure >= p && data[i + 1].pressure <= p) {
                // Linear interpolation
                const p1 = data[i].pressure;
                const p2 = data[i + 1].pressure;
                const h1 = data[i].height;
                const h2 = data[i + 1].height;

                const ratio = (p - p1) / (p2 - p1);
                return h1 + ratio * (h2 - h1);
            }
        }

        // Outside range, use closest value
        if (p >= data[0].pressure) return data[0].height;
        if (p <= data[data.length - 1].pressure) return data[data.length - 1].height;

        return 0;
    }

    /**
     * Convert pressure to Y coordinate (using height)
     */
    pressureToY(p) {
        const h = this.pressureToHeight(p);
        return this.heightToY(h);
    }

    /**
     * Convert temperature to X coordinate (with skew)
     */
    tempToX(t, p) {
        // Base x position from temperature
        const ratio = (t - this.tMin) / (this.tMax - this.tMin);
        const baseX = this.margin.left + this.width * ratio;

        // Add skew based on pressure
        const logP = Math.log(p);
        const logPMax = Math.log(this.pMax);
        const skewOffset = this.skew * (logPMax - logP);

        return baseX + skewOffset;
    }

    /**
     * Clear and draw complete diagram
     */
    draw(soundingData) {
        // Store sounding data for height conversions
        this.soundingData = soundingData;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid and labels
        this.drawHeightAxis();
        this.drawPressureLines();
        this.drawIsotherms();
        this.drawDryAdiabats();
        this.drawMoistAdiabats();
        this.drawMixingRatioLines();

        // Draw border
        this.drawBorder();

        // Draw data if provided
        if (soundingData && soundingData.data && soundingData.data.length > 0) {
            this.drawTemperatureProfile(soundingData.data);
            this.drawDewpointProfile(soundingData.data);
            this.drawWindBarbs(soundingData.data);
        }

        // Draw title
        this.drawTitle(soundingData?.metadata);
    }

    /**
     * Draw height axis labels
     */
    drawHeightAxis() {
        this.ctx.lineWidth = 1;
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillStyle = '#1a202c';
        this.ctx.strokeStyle = '#cbd5e0';

        // Determine appropriate height interval
        const range = this.hMax - this.hMin;
        let interval;
        if (range <= 2000) interval = 200;
        else if (range <= 5000) interval = 500;
        else if (range <= 10000) interval = 1000;
        else if (range <= 20000) interval = 2000;
        else interval = 5000;

        // Draw height lines and labels
        for (let h = Math.ceil(this.hMin / interval) * interval; h <= this.hMax; h += interval) {
            const y = this.heightToY(h);
            const x = this.margin.left;

            // Draw subtle line
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + 10, y);
            this.ctx.stroke();

            // Draw label
            this.ctx.textAlign = 'right';
            this.ctx.fillText(h + ' m', x - 5, y + 4);
        }

        // Reset text align
        this.ctx.textAlign = 'left';
    }

    /**
     * Draw pressure (isobar) lines
     */
    drawPressureLines() {
        const pressures = [1000, 925, 850, 700, 500, 400, 300, 250, 200, 150, 100];
        const minorPressures = [975, 950, 900, 875, 825, 800, 775, 750, 725, 675, 650, 625, 600, 575, 550, 525, 475, 450, 425, 375, 350, 325, 275, 225, 175, 125];

        this.ctx.lineWidth = 1;
        this.ctx.font = '12px Arial';

        // Major pressure lines
        this.ctx.strokeStyle = '#333333';
        this.ctx.fillStyle = '#333333';

        pressures.forEach(p => {
            if (p < this.pMin || p > this.pMax) return;

            const h = this.pressureToHeight(p);
            if (h < this.hMin || h > this.hMax) return;

            const y = this.heightToY(h);
            const x1 = this.margin.left;
            const x2 = this.margin.left + this.width;

            // Check if y is within diagram bounds
            if (y < this.margin.top || y > this.margin.top + this.height) return;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y);
            this.ctx.lineTo(x2, y);
            this.ctx.stroke();

            // Label on right side
            this.ctx.textAlign = 'left';
            this.ctx.fillText(p + ' mb', x2 + 5, y + 4);
        });

        // Minor pressure lines
        this.ctx.strokeStyle = '#cccccc';
        minorPressures.forEach(p => {
            if (p < this.pMin || p > this.pMax) return;

            const h = this.pressureToHeight(p);
            if (h < this.hMin || h > this.hMax) return;

            const y = this.heightToY(h);
            const x1 = this.margin.left;
            const x2 = this.margin.left + this.width;

            // Check if y is within diagram bounds
            if (y < this.margin.top || y > this.margin.top + this.height) return;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y);
            this.ctx.lineTo(x2, y);
            this.ctx.stroke();
        });
    }

    /**
     * Draw isotherms (temperature lines)
     */
    drawIsotherms() {
        this.ctx.lineWidth = 1;
        this.ctx.font = '11px Arial';

        for (let t = -100; t <= 50; t += 10) {
            if (t < this.tMin - 20 || t > this.tMax + 20) continue;

            const isMajor = t % 20 === 0;
            this.ctx.strokeStyle = isMajor ? '#00aa00' : '#90EE90';
            this.ctx.fillStyle = '#006600';

            const x1 = this.tempToX(t, this.pMax);
            const y1 = this.pressureToY(this.pMax);
            const x2 = this.tempToX(t, this.pMin);
            const y2 = this.pressureToY(this.pMin);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            // Label at bottom
            if (isMajor) {
                this.ctx.save();
                this.ctx.translate(x1, y1 + 20);
                this.ctx.rotate(-Math.PI / 4);
                this.ctx.fillText(t + '°C', 0, 0);
                this.ctx.restore();
            }
        }
    }

    /**
     * Draw dry adiabats
     */
    drawDryAdiabats() {
        this.ctx.strokeStyle = 'rgba(255, 140, 0, 0.4)';
        this.ctx.lineWidth = 1;

        // Dry adiabats follow potential temperature lines
        for (let theta = 200; theta <= 500; theta += 10) {
            this.ctx.beginPath();
            let firstPoint = true;

            for (let p = this.pMax; p >= this.pMin; p -= 5) {
                // Calculate temperature from potential temperature
                // T = theta * (P/P0)^(R/cp) where P0 = 1000 mb, R/cp ≈ 0.286
                const t = theta * Math.pow(p / 1000, 0.286) - 273.15;

                if (t < this.tMin - 20 || t > this.tMax + 40) continue;

                const x = this.tempToX(t, p);
                const y = this.pressureToY(p);

                if (firstPoint) {
                    this.ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }

    /**
     * Draw saturated (moist) adiabats
     */
    drawMoistAdiabats() {
        this.ctx.strokeStyle = 'rgba(0, 100, 255, 0.3)';
        this.ctx.lineWidth = 1;

        // Simplified moist adiabats (pseudo-adiabatic)
        for (let thetaE = 280; thetaE <= 380; thetaE += 10) {
            this.ctx.beginPath();
            let firstPoint = true;

            for (let p = this.pMax; p >= this.pMin; p -= 5) {
                // Simplified calculation (not exact)
                const t = thetaE * Math.pow(p / 1000, 0.286) - 273.15 - (1050 - p) * 0.02;

                if (t < this.tMin - 20 || t > this.tMax + 40) continue;

                const x = this.tempToX(t, p);
                const y = this.pressureToY(p);

                if (firstPoint) {
                    this.ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }

    /**
     * Draw mixing ratio lines
     */
    drawMixingRatioLines() {
        this.ctx.strokeStyle = 'rgba(150, 75, 0, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.font = '9px Arial';
        this.ctx.fillStyle = 'rgba(150, 75, 0, 0.7)';

        const mixingRatios = [0.5, 1, 2, 4, 8, 16, 32];

        mixingRatios.forEach(w => {
            this.ctx.beginPath();
            let firstPoint = true;

            for (let p = this.pMax; p >= 600; p -= 10) {
                // Calculate dewpoint from mixing ratio
                // Simplified approximation
                const e = (w * p) / (621.97 + w);
                const td = 243.5 * Math.log(e / 6.112) / (17.67 - Math.log(e / 6.112));

                if (td < this.tMin - 20 || td > this.tMax + 20) continue;

                const x = this.tempToX(td, p);
                const y = this.pressureToY(p);

                if (x < this.margin.left || x > this.margin.left + this.width) continue;

                if (firstPoint) {
                    this.ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        });
    }

    /**
     * Draw temperature profile
     */
    drawTemperatureProfile(data) {
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();

        let firstPoint = true;
        data.forEach(row => {
            if (isNaN(row.temp) || row.pressure < this.pMin || row.pressure > this.pMax) return;
            if (row.height < this.hMin || row.height > this.hMax) return;

            const x = this.tempToX(row.temp, row.pressure);
            const y = this.heightToY(row.height);

            if (firstPoint) {
                this.ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    /**
     * Draw dewpoint profile
     */
    drawDewpointProfile(data) {
        this.ctx.strokeStyle = '#00aa00';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();

        let firstPoint = true;
        data.forEach(row => {
            if (isNaN(row.dewpoint) || row.pressure < this.pMin || row.pressure > this.pMax) return;
            if (row.height < this.hMin || row.height > this.hMax) return;

            const x = this.tempToX(row.dewpoint, row.pressure);
            const y = this.heightToY(row.height);

            if (firstPoint) {
                this.ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    /**
     * Draw wind barbs
     */
    drawWindBarbs(data) {
        const xBarb = this.margin.left + this.width + 20;

        // Filter data for wind barbs (by height interval)
        const windData = [];
        const heightRange = this.hMax - this.hMin;
        const interval = heightRange < 5000 ? 250 : 500; // Height interval in meters
        let lastH = -10000;

        data.forEach(row => {
            if (row.pressure >= this.pMin && row.pressure <= this.pMax &&
                row.height >= this.hMin && row.height <= this.hMax &&
                !isNaN(row.windSpeed) && !isNaN(row.windDir)) {

                if (Math.abs(row.height - lastH) >= interval || windData.length === 0) {
                    windData.push(row);
                    lastH = row.height;
                }
            }
        });

        windData.forEach(row => {
            const y = this.heightToY(row.height);
            this.drawWindBarb(xBarb, y, row.windDir, row.windSpeed);
        });
    }

    /**
     * Draw individual wind barb (NWS-style convention using km/h)
     * - Calm (< 2.5 km/h): circle
     * - Half barb = 5 km/h
     * - Full barb = 10 km/h
     * - Pennant = 50 km/h
     */
    drawWindBarb(x, y, direction, speedMS) {
        // Convert m/s to km/h
        const speedKmh = speedMS * 3.6;

        // Barb staff points toward where wind is coming FROM
        // Direction is in meteorological convention (where wind comes from)
        const angle = direction * Math.PI / 180;

        const barbLength = 30;
        const flagWidth = 10;

        this.ctx.strokeStyle = '#000000';
        this.ctx.fillStyle = '#000000';
        this.ctx.lineWidth = 1.5;

        // Calm winds (< 2.5 km/h)
        if (speedKmh < 2.5) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.stroke();
            return;
        }

        // Draw main staff
        const staffEndX = x + Math.sin(angle) * barbLength;
        const staffEndY = y - Math.cos(angle) * barbLength;

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(staffEndX, staffEndY);
        this.ctx.stroke();

        // Draw flags/barbs based on speed in km/h
        // Half barb = 5 km/h
        // Full barb = 10 km/h
        // Pennant = 50 km/h

        let currentSpeed = speedKmh;
        let currentDist = barbLength;

        // Barbs extend to the right of staff (clockwise, -90 degrees)
        const perpAngle = angle - Math.PI / 2;

        // Pennants (50 km/h each)
        while (currentSpeed >= 47.5) {
            const x1 = x + Math.sin(angle) * currentDist;
            const y1 = y - Math.cos(angle) * currentDist;
            const x2 = x + Math.sin(angle) * (currentDist - 8);
            const y2 = y - Math.cos(angle) * (currentDist - 8);
            const x3 = x2 + Math.sin(perpAngle) * flagWidth;
            const y3 = y2 - Math.cos(perpAngle) * flagWidth;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x3, y3);
            this.ctx.lineTo(x2, y2);
            this.ctx.closePath();
            this.ctx.fill();

            currentSpeed -= 50;
            currentDist -= 10;
        }

        // Full barbs (10 km/h each)
        while (currentSpeed >= 7.5) {
            const x1 = x + Math.sin(angle) * currentDist;
            const y1 = y - Math.cos(angle) * currentDist;
            const x2 = x1 + Math.sin(perpAngle) * flagWidth;
            const y2 = y1 - Math.cos(perpAngle) * flagWidth;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            currentSpeed -= 10;
            currentDist -= 6;
        }

        // Half barb (5 km/h)
        if (currentSpeed >= 2.5) {
            const x1 = x + Math.sin(angle) * currentDist;
            const y1 = y - Math.cos(angle) * currentDist;
            const x2 = x1 + Math.sin(perpAngle) * (flagWidth / 2);
            const y2 = y1 - Math.cos(perpAngle) * (flagWidth / 2);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }

    /**
     * Draw border around diagram
     */
    drawBorder() {
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.margin.left,
            this.margin.top,
            this.width,
            this.height
        );
    }

    /**
     * Draw title and metadata
     */
    drawTitle(metadata) {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 18px Arial';

        let title = 'Skew-T Log-P Diagram';
        if (metadata?.stationName) {
            title = metadata.stationName;
        }

        this.ctx.fillText(title, this.margin.left, 25);

        // Add metadata
        if (metadata) {
            this.ctx.font = '12px Arial';
            let infoText = '';

            if (metadata.observationTime) {
                infoText += metadata.observationTime + '  ';
            }
            if (metadata.latitude && metadata.longitude) {
                infoText += `Lat: ${metadata.latitude.toFixed(2)}° Lon: ${metadata.longitude.toFixed(2)}°`;
            }

            this.ctx.fillText(infoText, this.margin.left, 42);
        }

        // Legend
        const legendX = this.margin.left + this.width - 200;
        const legendY = this.margin.top + 20;

        this.ctx.font = '12px Arial';

        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(legendX, legendY);
        this.ctx.lineTo(legendX + 30, legendY);
        this.ctx.stroke();
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText('Temperature', legendX + 35, legendY + 4);

        this.ctx.strokeStyle = '#00aa00';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(legendX, legendY + 20);
        this.ctx.lineTo(legendX + 30, legendY + 20);
        this.ctx.stroke();
        this.ctx.fillText('Dew Point', legendX + 35, legendY + 24);
    }
}
