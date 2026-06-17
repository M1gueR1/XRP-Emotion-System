export const CUSTOM_EMOTIONS_CHANGED_EVENT =
  "xrp-custom-emotions-changed";


export function notifyCustomEmotionsChanged():
  void {
  window.dispatchEvent(
    new CustomEvent(
      CUSTOM_EMOTIONS_CHANGED_EVENT
    )
  );
}