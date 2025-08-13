# Image Processing API

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

---

## Access / Serve Image

- **Endpoint:** `GET /media/:id`

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

---

## Example Usage

### Upload with multipart/form-data

```bash
curl -X POST http://localhost:5000/media \
  -F "file=@/path/to/image.jpg"
```

### Upload raw binary with fileName query
```bash
curl -X POST "http://localhost:5000/media?fileName=image.jpg" \
  --header "Content-Type: image/jpeg" \
  --data-binary "@/path/to/image.jpg"
```

### Access image with resizing and rotation
```bash
curl "http://localhost:5000/media/123abc?size=150x150&rotate=90&quality=80"
```