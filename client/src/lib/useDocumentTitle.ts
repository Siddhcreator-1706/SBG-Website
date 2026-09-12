import { useEffect } from 'react';

/**
 * Sets the document title and canonical link for SEO and browser tab display.
 * Resets to "SBG DAU" on unmount if the component navigates away.
 */
export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    let isNewMeta = false;
    let previousDescription = '';

    if (description) {
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        isNewMeta = true;
      } else {
        previousDescription = metaDescription.content;
      }
      metaDescription.content = description;

      if (isNewMeta) {
        document.head.appendChild(metaDescription);
      }
    }

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
      
      if (description) {
        if (isNewMeta && metaDescription?.parentNode) {
          metaDescription.parentNode.removeChild(metaDescription);
        } else if (metaDescription) {
          metaDescription.content = previousDescription;
        }
      }

      if (isNewLink && canonicalLink.parentNode) {
        canonicalLink.parentNode.removeChild(canonicalLink);
      } else {
        canonicalLink.href = previousHref;
      }
    };
  }, [title, description]);
}
