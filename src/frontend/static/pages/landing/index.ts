const baseUrl = `/_api/v1`;
const dropZone = document.getElementById('dropZone')!;
const fileInput = document.getElementById('fileInput')! as HTMLInputElement;

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');

    if (event.dataTransfer && event.dataTransfer.files.length) {
        const file = event.dataTransfer.files[0];
        handleFile(file);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files!.length) {
        handleFile(fileInput.files![0]);
    }
});

async function handleFile(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('media', file);

    try {
        const res = await fetch(`${baseUrl}/media`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        // Assuming API returns { url: "...", id: "..." }
        window.location.href = `/editor/${data.id}`;
    } catch (err) {
        alert('❌ Error uploading file');
        console.error(err);
    }
}
