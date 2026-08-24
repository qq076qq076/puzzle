(() => {
  const LoadingScene = window.GuoguanLoadingScene;
  const Level01Scene = window.GuoguanLevel01Scene;

  if (!window.Phaser || !LoadingScene || !Level01Scene) {
    const status = document.getElementById("game-status");
    if (status) status.textContent = "遊戲載入失敗";
    return;
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-shell",
    backgroundColor: "#000000",
    render: { antialias: true, roundPixels: false },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight
    },
    input: { activePointers: 3 },
    scene: [LoadingScene, Level01Scene]
  });

  game.registry.set("nextLevelScene", "Level01Scene");
  game.canvas?.setAttribute("aria-label", "過關遊戲畫面");
  game.canvas?.setAttribute("role", "img");
  game.scene.start("LoadingScene");
})();
