# FairWindSK Settings API Documentation

## Base URL
All endpoints are relative to: `/plugins/fairwindsk-settings`

## Endpoints

### Get Configuration
Retrieves the complete FairWindSK configuration.

**Endpoint:** `GET /config`

**Response:**
```json
{
  "main": {
    "virtualKeyboard": boolean,
    "autopilot": string,
    "windowMode": "windowed" | "centered" | "maximized" | "fullscreen",
    "windowWidth": number,
    "windowHeight": number,
    "windowTop": number,
    "windowLeft": number
  },
  "connection": {
    "server": string
  },
  "signalk": {
    "btw": string,
    "cog": string,
    ...
  },
  "apps": [
    {
      "name": string,
      "description": string,
      "fairwind": {
        "active": boolean,
        "order": number
      },
      "signalk": {
        "displayName": string,
        "appIcon": string
      }
    }
  ],
  "units": {
    "airPressure": string,
    "airTemperature": string,
    "waterTemperature": string,
    "depth": string,
    "distance": string,
    "range": string,
    "vesselSpeed": string,
    "windSpeed": string
  },
  "applications": {
    "autopilot": string,
    "anchor": string,
    "mydata": string
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Failed to load configuration

---

### Update Configuration (Full Replace)
Replaces the entire configuration with the provided data.

**Endpoint:** `PUT /config`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
Complete configuration object (see GET /config response)

**Response:**
```json
{
  "success": true,
  "message": "Configuration saved"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid JSON
- `500 Internal Server Error` - Failed to save

**Example:**
```bash
curl -X PUT http://localhost:3000/plugins/fairwindsk-settings/config \
  -H "Content-Type: application/json" \
  -d @fairwindsk.json
```

---

### Partial Update Configuration
Updates only the specified fields, preserving other configuration.

**Endpoint:** `PATCH /config`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
Partial configuration object

**Example Request:**
```json
{
  "main": {
    "windowWidth": 1920,
    "windowHeight": 1080
  },
  "units": {
    "depth": "ft"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid JSON
- `500 Internal Server Error` - Failed to update

**Example:**
```bash
curl -X PATCH http://localhost:3000/plugins/fairwindsk-settings/config \
  -H "Content-Type: application/json" \
  -d '{"main":{"windowWidth":1920}}'
```

---

### Reset to Defaults
Resets all configuration to factory defaults.

**Endpoint:** `POST /config/reset`

**Response:**
```json
{
  "success": true,
  "message": "Configuration reset to defaults"
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Failed to reset

**Example:**
```bash
curl -X POST http://localhost:3000/plugins/fairwindsk-settings/config/reset
```

---

## Configuration Fields Reference

### Main Settings

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `virtualKeyboard` | boolean | `true`, `false` | Enable virtual keyboard |
| `autopilot` | string | - | Autopilot plugin name |
| `windowMode` | string | `windowed`, `centered`, `maximized`, `fullscreen` | Window display mode |
| `windowWidth` | number | 800-3840 | Window width in pixels |
| `windowHeight` | number | 600-2160 | Window height in pixels |
| `windowTop` | number | 0+ | Window top position |
| `windowLeft` | number | 0+ | Window left position |

### Units

| Field | Type | Possible Values | Description |
|-------|------|-----------------|-------------|
| `airPressure` | string | `hPa`, `mb`, `psi`, `mmHg` | Air pressure unit |
| `airTemperature` | string | `C`, `F`, `K` | Air temperature unit |
| `waterTemperature` | string | `C`, `F`, `K` | Water temperature unit |
| `depth` | string | `mt`, `ft`, `ftm` | Depth measurement unit |
| `distance` | string | `nm`, `km`, `ml`, `m` | Distance unit |
| `range` | string | `rm`, `rft` | Range unit |
| `vesselSpeed` | string | `kn`, `kmh`, `mph`, `ms` | Speed unit |
| `windSpeed` | string | `kn`, `kmh`, `mph`, `ms` | Wind speed unit |

### Signal K Paths

All Signal K path mappings follow the pattern:
```
"shortName": "full.signalk.path"
```

Example:
```json
{
  "cog": "navigation.courseOverGroundTrue",
  "sog": "navigation.speedOverGround"
}
```

### Applications

Each application object contains:

```json
{
  "name": "string",           // Unique identifier or URL
  "description": "string",     // Human-readable description
  "fairwind": {
    "active": boolean,         // Whether app is enabled
    "order": number            // Display order (lower = higher priority)
  },
  "signalk": {
    "displayName": "string",   // Display name in UI
    "appIcon": "string"        // Path to icon image
  }
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

Common error codes:
- `400 Bad Request` - Invalid input data
- `404 Not Found` - Endpoint not found
- `500 Internal Server Error` - Server-side error

---

## Integration Examples

### JavaScript/Fetch

```javascript
// Get configuration
const config = await fetch('/plugins/fairwindsk-settings/config')
  .then(response => response.json());

// Update window size
await fetch('/plugins/fairwindsk-settings/config', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    main: { windowWidth: 1920, windowHeight: 1080 }
  })
});
```

### Python

```python
import requests

# Get configuration
response = requests.get('http://localhost:3000/plugins/fairwindsk-settings/config')
config = response.json()

# Update units
requests.patch(
    'http://localhost:3000/plugins/fairwindsk-settings/config',
    json={'units': {'depth': 'ft', 'distance': 'nm'}}
)
```

### Node.js

```javascript
const axios = require('axios');

const baseUrl = 'http://localhost:3000/plugins/fairwindsk-settings';

// Get configuration
const config = await axios.get(`${baseUrl}/config`);

// Add new application
const newConfig = config.data;
newConfig.apps.push({
  name: 'my-app',
  description: 'My Custom App',
  fairwind: { active: true, order: 500 },
  signalk: { displayName: 'My App', appIcon: null }
});

await axios.put(`${baseUrl}/config`, newConfig);
```

---

## Rate Limiting

Currently, there are no rate limits on API endpoints. However, it's recommended to:
- Avoid excessive rapid requests
- Use PATCH instead of PUT for small updates
- Cache configuration locally when possible

---

## Versioning

This API follows semantic versioning. The current version is `1.0.0`.

Breaking changes will increment the major version number.

---

## Support

For API issues and questions:
- GitHub Issues: [Project Repository]
- Signal K Forum: https://forum.signalk.org/
