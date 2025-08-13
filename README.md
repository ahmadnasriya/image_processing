# Image Processing API

A lightweight and efficient HTTP API for uploading, storing, and transforming images on demand.  
Supports multiple upload methods, dynamic resizing, rotation, flipping, quality adjustments, and optimized serving.  
Designed for integration with web apps, mobile apps, and automated processing pipelines.

---

## Base URL:
```
/_api/v1
```
All endpoints are prefixed with this base path.

---

## Features

- **Multiple upload methods** — form-data or raw binary
- **On-the-fly transformations** — resize, rotate, flip, and adjust quality without storing duplicates
- **Non-destructive processing** — original images are kept unchanged
- **Format-preserving output** — processed image retains its original format unless explicitly transformed
- **Optimized for performance** — uses in-memory processing with streaming
- **Strict input validation** — invalid parameters are rejected with detailed error messages

---

## Upload Image

- **Endpoint:** `POST /media`
- **Content-Type:**
  - `multipart/form-data` (recommended) — for uploading images via form-data.
  - Raw binary data (e.g., `application/octet-stream`) — **requires** `fileName` query parameter.

### Query Parameters (required for raw binary upload only):

| Parameter  | Description                       | Required | Example     |
| ---------- | --------------------------------- | -------- | ----------- |
| `fileName` | Original file name with extension | Yes      | `photo.jpg` |

### Notes:

- Only a single file can be uploaded per request.
- Accepted MIME types: `image/png`, `image/jpeg`, `image/jpg`.
- For form uploads, `fileName` is derived from the uploaded file.
- For raw binary uploads, `fileName` must be specified as a query parameter.
- Invalid or unsupported file types return `415 Unsupported Media Type`.
- Large file uploads are streamed directly to disk to reduce memory usage.

---

## Access / Serve Image

- **Endpoint:** `GET /media/:id`
- **:id** refers to the unique identifier returned after upload.

### Query Parameters (all optional):

| Parameter | Description                          | Format / Allowed Values              | Notes                                    |
| --------- | ------------------------------------ | ------------------------------------ | ---------------------------------------- |
| `size`    | Resize image to specified dimensions | `${width}x${height}`, e.g. `150x150` | Requires both width and height to be set |
| `width`   | Resize width                         | Number (pixels)                      | Can be used alone or with `height`       |
| `height`  | Resize height                        | Number (pixels)                      | Can be used alone or with `width`        |
| `rotate`  | Rotate image clockwise               | Number (0–360 degrees)               | Values > 360 are rejected                |
| `quality` | Compression quality                  | Number (1–100)                       | Applies to JPEG/PNG output               |
| `flip`    | Flip image vertically                | Boolean (`true` or `false`)          |                                          |
| `flop`    | Flip image horizontally              | Boolean (`true` or `false`)          |                                          |

### Notes:

- If `size` is provided, both width and height **must** be included in the format `WIDTHxHEIGHT`.
- If `size` is not provided, `width` and/or `height` may be specified independently.
- If resizing dimensions exceed the original image size, the original image is returned without scaling up.
- Rotation, flip, flop, and quality adjustments are optional and default to no changes if omitted.
- Invalid parameters trigger a `400 Bad Request` with a descriptive error message.
- Responses are streamed with correct `Content-Type` headers for the processed image.

---

## Error Responses

| Status Code | Description |
| ----------- | ----------- |
| `400`       | Invalid request parameters or missing file name for raw uploads |
| `404`       | Image not found |
| `415`       | Unsupported file type |
| `500`       | Internal server error during processing |

---

## Example Usage

### Upload with multipart/form-data
```bash
curl -X POST http://localhost:5000/_api/v1/media \
  -F "file=@/path/to/image.jpg"
```

### Upload raw binary with fileName query
```bash
curl -X POST "http://localhost:5000/_api/v1/media?fileName=image.jpg" \
  --header "Content-Type: image/jpeg" \
  --data-binary "@/path/to/image.jpg"
```

### Access image with resizing and rotation
```bash
curl "http://localhost:5000/_api/v1/media/123abc?size=150x150&rotate=90&quality=80"
```

---
### Implementation Notes
- Uses efficient streaming to avoid blocking large file uploads.
- Processing is powered by a high-performance image library with SIMD acceleration.
- Original files are stored securely with unique IDs; transformations are generated on request.
- Optional in-memory caching can be enabled for frequently accessed images.