import { useEffect } from 'react';

/**
 * Sets the document title and canonical link for SEO and browser tab display.
 * Resets to "SBG DAU" on unmount if the component navigates away.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    let isNewLink = false;
    
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      isNewLink = true;
    }
    
    const previousHref = canonicalLink.href;
    canonicalLink.href = window.location.origin + window.location.pathname;
    
    if (isNewLink) {
      document.head.appendChild(canonicalLink);
    }

    return () => {
      document.title = previousTitle;
      if (isNewLink && canonicalLink.parentNode) {
        canonicalLink.parentNode.removeChild(canonicalLink);
      } else {
        canonicalLink.href = previousHref;
      }
    };
  }, [title]);
}
