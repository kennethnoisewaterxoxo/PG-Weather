/**
 * Parser for University of Wyoming Atmospheric Sounding Data
 */

class SoundingDataParser {
    constructor() {
        this.data = null;
        this.metadata = {};
    }

    /**
     * Parse raw text data from UW Wyoming
     * @param {string} rawText - Raw text from the sounding page
     * @returns {object} Parsed sounding data with metadata
     */
    parse(rawText) {
        try {
            // Extract metadata
            this.metadata = this.extractMetadata(rawText);

            // Extract tabular data
            const rows = this.extractDataRows(rawText);

            // Parse each row
            this.data = rows.map(row => this.parseRow(row)).filter(row => row !== null);

            return {
                metadata: this.metadata,
                data: this.data,
                valid: this.data.length > 0
            };
        } catch (error) {
            console.error('Error parsing sounding data:', error);
            return {
                metadata: {},
                data: [],
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Extract metadata from the header
     */
    extractMetadata(text) {
        const metadata = {};

        // Extract station number
        const stationMatch = text.match(/Station\s+number:\s*(\d+)/i) ||
                           text.match(/id=(\d+)/i);
        if (stationMatch) {
            metadata.station = stationMatch[1];
        }

        // Extract station name
        const stationNameMatch = text.match(/Observation\s+at\s+\d+Z\s+\d+\s+\w+\s+\d+\s*\n\s*([^\n]+)/i) ||
                                text.match(/Station\s+identifier:\s*([^\n]+)/i);
        if (stationNameMatch) {
            metadata.stationName = stationNameMatch[1].trim();
        }

        // Extract latitude and longitude
        const latMatch = text.match(/Latitude:\s*([-\d.]+)/i);
        const lonMatch = text.match(/Longitude:\s*([-\d.]+)/i);
        if (latMatch) metadata.latitude = parseFloat(latMatch[1]);
        if (lonMatch) metadata.longitude = parseFloat(lonMatch[1]);

        // Extract elevation
        const elevMatch = text.match(/Elevation:\s*([\d.]+)/i) ||
                         text.match(/Station\s+elevation:\s*([\d.]+)/i);
        if (elevMatch) {
            metadata.elevation = parseFloat(elevMatch[1]);
        }

        // Extract observation time
        const timeMatch = text.match(/Observation\s+at\s+(\d+Z\s+\d+\s+\w+\s+\d+)/i) ||
                         text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        if (timeMatch) {
            metadata.observationTime = timeMatch[1];
        }

        return metadata;
    }

    /**
     * Extract data rows from the text
     */
    extractDataRows(text) {
        // Find the data table section
        const lines = text.split('\n');
        const dataLines = [];
        let inDataSection = false;

        for (let line of lines) {
            // Look for header line
            if (line.includes('PRES') && line.includes('HGHT') && line.includes('TEMP')) {
                inDataSection = true;
                continue;
            }

            // Check if we've left the data section
            if (inDataSection) {
                // Stop at horizontal line or empty lines after data starts
                if (line.match(/^[-\s]+$/) || line.trim() === '') {
                    if (dataLines.length > 0) {
                        // Only stop if we've already collected data
                        continue;
                    }
                }

                // Check if line contains numeric data
                if (line.match(/^\s*\d+/) && dataLines.length < 1000) {
                    dataLines.push(line);
                }

                // Stop at station information or other metadata
                if (line.match(/Station\s+(information|identifier)/i)) {
                    break;
                }
            }
        }

        return dataLines;
    }

    /**
     * Parse a single data row
     */
    parseRow(line) {
        const values = line.trim().split(/\s+/);

        if (values.length < 11) {
            return null;
        }

        try {
            return {
                pressure: parseFloat(values[0]),      // hPa
                height: parseFloat(values[1]),        // meters
                temp: parseFloat(values[2]),          // Celsius
                dewpoint: parseFloat(values[3]),      // Celsius
                relHumidity: parseFloat(values[4]),   // %
                mixingRatio: parseFloat(values[5]),   // g/kg
                windDir: parseFloat(values[6]),       // degrees
                windSpeed: parseFloat(values[7]),     // m/s
                theta: parseFloat(values[8]),         // K
                thetaE: parseFloat(values[9]),        // K
                thetaV: parseFloat(values[10])        // K
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get data filtered by pressure range
     */
    getDataInRange(minPressure = 100, maxPressure = 1050) {
        if (!this.data) return [];

        return this.data.filter(row =>
            row.pressure >= minPressure &&
            row.pressure <= maxPressure &&
            !isNaN(row.temp) &&
            !isNaN(row.dewpoint)
        );
    }

    /**
     * Get wind data for barb plotting (reduced points)
     */
    getWindData(interval = 50) {
        if (!this.data) return [];

        // Select every nth point or by pressure intervals
        const windData = [];
        let lastPressure = 10000;

        for (let row of this.data) {
            if (!isNaN(row.windDir) && !isNaN(row.windSpeed)) {
                if (lastPressure - row.pressure >= interval || row.pressure >= 1000) {
                    windData.push({
                        pressure: row.pressure,
                        direction: row.windDir,
                        speed: row.windSpeed
                    });
                    lastPressure = row.pressure;
                }
            }
        }

        return windData;
    }
}
