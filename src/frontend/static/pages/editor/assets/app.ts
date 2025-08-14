import type { MediaFilePublicMeta } from '../../../../../backend/docs';
import ImageEditor from '@static/pages/editor/assets/ImageEditor';
import elements from '@static/pages/editor/assets/elements';

const id = window.location.pathname.split('/').pop()!;
const mediaMeta = (await fetch(`/_api/v1/media/${id}/meta`).then((res) =>
    res.json()
)) as MediaFilePublicMeta;

const editor = new ImageEditor(mediaMeta, elements);

class EditorApp {
    readonly #_updateImgSrc: (src: string) => void;

    constructor() {
        this.#_init();

        this.#_updateImgSrc = (() => {
            let timer: ReturnType<typeof setTimeout>;
            return (src: string) => {
                clearTimeout(timer);
                timer = setTimeout(() => (elements.preview.src = src), 100);
            };
        })();
    }

    #_init() {
        // Prefill values
        elements.preview.src = elements.urlInput.value = editor.url;
        elements.size.width.value = editor.original.width.toString();
        elements.size.height.value = editor.original.height.toString();

        // Set limit
        elements.size.width.max = editor.original.width.toString();
        elements.size.height.max = editor.original.height.toString();

        editor.onChange((url) => {
            elements.resetBtn.disabled = editor.isOriginal;
            elements.urlInput.value = url;
            this.#_updateImgSrc(url);
        });

        elements.resetBtn.onclick = () => editor.reset();
        elements.downloadBtn.onclick = () => editor.download();

        let alertShown = false;
        elements.copyUrlBtn.onclick = () => {
            if (navigator.clipboard?.writeText) {
                elements.copyUrlBtn.disabled = true;
                navigator.clipboard?.writeText(editor.url).then(() => {
                    elements.copyUrlBtn.textContent = 'Copied!';

                    setTimeout(() => {
                        elements.copyUrlBtn.disabled = false;
                        elements.copyUrlBtn.textContent = 'Copy URL';
                    }, 1000);
                });
            } else {
                if (!alertShown) {
                    alertShown = true;

                    const m1 =
                        '❌ Clipboard copy is unavailable on this connection.';
                    const m2 =
                        'Use HTTPS or localhost — for now, copy the URL manually.';
                    alert(`${m1}\n\n${m2}`);
                }

                elements.urlInput.select();
            }
        };

        const aspectRatio = editor.original.width / editor.original.height;
        elements.preview.style.aspectRatio = `${editor.original.width} / ${editor.original.height}`;

        elements.size.width.oninput = () => {
            const value = elements.size.width.value;
            if (value === '') {
                elements.size.width.value = editor.original.width.toString();
                elements.size.height.value = editor.original.height.toString();
                editor.setWidth(editor.original.width);
                return;
            }

            const widthValue = parseInt(value, 10);
            const heightValue = Math.round(widthValue / aspectRatio);
            elements.size.height.value = heightValue.toString();

            editor.setWidth(widthValue);
        };

        elements.size.height.oninput = () => {
            const value = elements.size.height.value;
            if (value === '') {
                elements.size.height.value = editor.original.height.toString();
                elements.size.width.value = editor.original.width.toString();
                editor.setHeight(editor.original.height);
                return;
            }

            const heightValue = parseInt(value, 10);
            const widthValue = Math.round(heightValue * aspectRatio);
            elements.size.width.value = widthValue.toString();

            editor.setHeight(heightValue);
        };

        elements.quality.num.oninput = () => {
            const qStr = elements.quality.num.value;
            const qualityValue = parseInt(qStr, 10);
            elements.quality.slider.value = qStr;

            editor.setQuality(qualityValue);
        };

        elements.quality.slider.oninput = () => {
            const qStr = elements.quality.slider.value;
            const qualityValue = parseInt(qStr, 10);
            elements.quality.num.value = qStr;

            editor.setQuality(qualityValue);
        };

        elements.rotate.right.onclick = () => {
            const newAngleInput = editor.configs.rotate + 90;
            const newAngle =
                newAngleInput > 360 ? newAngleInput - 360 : newAngleInput;
            editor.rotate(newAngle);
        };

        elements.rotate.left.onclick = () => {
            const newAngleInput = editor.configs.rotate - 90;
            const newAngle =
                newAngleInput < 0 ? newAngleInput + 360 : newAngleInput;
            editor.rotate(newAngle);
        };

        elements.flip.horizontal.onclick = () => editor.flop();
        elements.flip.vertical.onclick = () => editor.flip();
    }
}

const app = new EditorApp();
export default app;
