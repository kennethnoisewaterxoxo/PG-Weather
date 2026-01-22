# Skew-T Log-P Diagram Visualizer

A professional web-based atmospheric sounding visualizer that displays Skew-T Log-P diagrams from University of Wyoming weather data.

## Features

- **Professional Skew-T Log-P Diagram**: Standard meteorological visualization with:
  - Logarithmic pressure scale
  - Skewed temperature coordinates
  - Isotherms (temperature lines)
  - Isobars (pressure lines)
  - Dry adiabats
  - Moist adiabats
  - Mixing ratio lines

- **Temperature and Dew Point Profiles**: Visualize atmospheric temperature and moisture profiles

- **Wind Barbs**: Display wind speed and direction at various pressure levels

- **Dynamic Data Loading**:
  - Select any weather station by WMO ID
  - Choose date and time (00 UTC or 12 UTC)
  - Automatic data fetching from University of Wyoming

- **Station Information Display**: Shows latitude, longitude, elevation, and observation time

## Getting Started

### Running Locally

1. Simply open `index.html` in a modern web browser (Chrome, Firefox, Edge, or Safari)

2. The visualizer will load with default data from Vernon, BC (Station 73033)

### Using the Visualizer

1. **Enter Station ID**: WMO station identifier (e.g., 72340 for Oakland, 73033 for Vernon)
   - Find station IDs at: https://weather.uwyo.edu/upperair/sounding.html

2. **Select Date**: Choose the observation date

3. **Select Hour**: Choose 00 UTC or 12 UTC (standard observation times)

4. **Click "Load Sounding"**: The diagram will update with the new data

### Understanding the Diagram

#### Lines and Colors:
- **Red Line**: Temperature profile
- **Green Line**: Dew point profile
- **Orange Lines**: Dry adiabats (constant potential temperature)
- **Blue Lines**: Moist adiabats (saturated ascent)
- **Brown Lines**: Mixing ratio lines (constant water vapor content)
- **Green Isotherms**: Temperature lines (vertical)
- **Black Isobars**: Pressure lines (horizontal)

#### Wind Barbs (right side, NWS-style convention):
- Staff points toward where wind is **coming FROM**
- **Half barb** (short line) = 5 km/h
- **Full barb** (long line) = 10 km/h
- **Pennant** (filled triangle) = 50 km/h
- **Circle** = calm winds (< 2.5 km/h)
- Barbs combine to show total wind speed (e.g., 25 km/h = 2 full barbs + 1 half barb)

### Example Stations

- **72340** - Oakland, CA
- **72376** - San Diego, CA
- **72469** - Denver, CO
- **72518** - Chicago, IL
- **72572** - Miami, FL
- **73033** - Vernon, BC
- **70261** - Eureka, NU (Arctic)

## Technical Details

### Files

- `index.html` - Main HTML structure and styling
- `app.js` - Application controller and data fetching
- `dataParser.js` - Parser for UW Wyoming sounding format
- `skewt.js` - Skew-T diagram rendering engine

### Data Source

Data is fetched from the University of Wyoming Atmospheric Soundings:
https://weather.uwyo.edu/upperair/sounding.html

### Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (v90+)
- Firefox (v88+)
- Safari (v14+)

### CORS Handling

The application attempts direct fetch first, then falls back to a CORS proxy if needed. This ensures data can be loaded across different browsers and configurations.

## Meteorological Applications

Skew-T diagrams are used for:
- Analyzing atmospheric stability
- Forecasting severe weather
- Determining cloud base and tops
- Calculating lifted indices and CAPE
- Planning aviation operations
- Understanding vertical wind shear

## Customization

### Adjust Diagram Bounds

Edit in `skewt.js`:
```javascript
// Pressure range (hPa)
this.pMin = 100;
this.pMax = 1050;

// Temperature range (Celsius)
this.tMin = -60;
this.tMax = 50;
```

### Modify Styling

Colors and styles can be adjusted in `index.html` (CSS) and `skewt.js` (diagram rendering).

## License

This is a demonstration project for educational and meteorological analysis purposes.

## Credits

Data source: University of Wyoming Department of Atmospheric Science
