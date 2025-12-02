export default defineContentScript({
  matches: ['*://*.x.com/*'],
  main() {
    console.log('Hello content.');
  },
});
