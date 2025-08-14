import type { RequiredStrict } from '@nasriya/atomix';
import type { FileServeQuery } from '../backend/docs';

export type ImageConfigs = Omit<RequiredStrict<FileServeQuery>, 'size'>;
export type EditorChangeHandler = (url: string) => void;

export interface AppElements {
    preview: HTMLImageElement;
    resetBtn: HTMLButtonElement;
    downloadBtn: HTMLButtonElement;
    urlInput: HTMLInputElement;
    copyUrlBtn: HTMLButtonElement;
    size: {
        width: HTMLInputElement;
        height: HTMLInputElement;
    };
    quality: {
        num: HTMLInputElement;
        slider: HTMLInputElement;
    };
    flip: {
        horizontal: HTMLButtonElement;
        vertical: HTMLButtonElement;
    };
    rotate: {
        right: HTMLButtonElement;
        left: HTMLButtonElement;
    };
}

export type SiteTheme = 'minimal' | 'dark' | 'fresh' | 'warm';
