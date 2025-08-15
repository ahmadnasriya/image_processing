import type { SiteTheme } from '../../docs';

class ThemesManager {
    readonly #_themes: SiteTheme[] = ['minimal', 'dark', 'fresh', 'warm'];
    readonly #_selector: HTMLSelectElement | null;

    constructor() {
        this.#_selector = document.getElementById(
            'themeSelector'
        ) as HTMLSelectElement | null;

        const theme = this.detectTheme();
        this.setTheme(theme);

        if (this.#_selector) {
            this.#_selector.addEventListener('change', (e) => {
                const value = (e.target as HTMLSelectElement).value;
                if (value) {
                    this.setTheme(value as SiteTheme);
                } else {
                    this.setTheme('auto');
                }
            });
        }
    }

    /**
     * Sets the current theme to the given value. If the given value is 'auto', the
     * data-theme attribute will be removed and the user's system theme will be used.
     * Otherwise, the data-theme attribute will be set to the given value and the
     * theme will be saved in local storage.
     *
     * @param theme The theme to set. Can be one of the values in the #_themes array
     *              or 'auto' to use the system theme.
     */
    setTheme(theme: SiteTheme | 'auto'): void {
        if (this.#_selector) {
            this.#_selector.value = theme;
        }

        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem('theme');
            return;
        }

        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    /**
     * Detects and returns the currently saved theme from local storage.
     * If no valid theme is found, it defaults to 'auto'.
     *
     * @returns {SiteTheme | 'auto'} The saved theme or 'auto' if no valid theme is set.
     */
    detectTheme(): SiteTheme | 'auto' {
        const savedTheme = localStorage.getItem('theme') as SiteTheme | null;
        if (!savedTheme || !this.#_themes.includes(savedTheme)) {
            return 'auto';
        }

        return savedTheme;
    }
}

const themesManager = new ThemesManager();
export default themesManager;
