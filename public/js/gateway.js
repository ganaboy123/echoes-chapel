(() => {
  const minDelay = 4500;
  const maxDelay = 6000;
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

  window.setTimeout(() => {
    window.location.replace('index.html?fromGateway=1');
  }, delay);
})();
