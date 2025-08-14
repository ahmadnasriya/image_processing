import type { AppElements } from '../../../../docs';

const elements: AppElements = {
    preview: document.getElementById('preview') as HTMLImageElement,
    size: {
        width: document.getElementById('width') as HTMLInputElement,
        height: document.getElementById('height') as HTMLInputElement,
    },
    quality: {
        num: document.getElementById('qualityNumber') as HTMLInputElement,
        slider: document.getElementById('qualitySlider') as HTMLInputElement,
    },
    flip: {
        horizontal: document.getElementById('flipH') as HTMLButtonElement,
        vertical: document.getElementById('flipV') as HTMLButtonElement,
    },
    rotate: {
        right: document.getElementById('rotateR') as HTMLButtonElement,
        left: document.getElementById('rotateL') as HTMLButtonElement,
    },
    resetBtn: document.getElementById('resetBtn') as HTMLButtonElement,
    downloadBtn: document.getElementById('downloadBtn') as HTMLButtonElement,
    urlInput: document.getElementById('imageUrlInput') as HTMLInputElement,
    copyUrlBtn: document.getElementById('copyBtn') as HTMLButtonElement,
};

export default elements;
