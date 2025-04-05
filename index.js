const { Client, GatewayIntentBits } = require("discord.js");
const { Player } = require("discord-player");
const { DefaultExtractors } = require("@discord-player/extractor");
const ffmpegPath = require("ffmpeg-static");

process.env.FFMPEG_PATH = ffmpegPath;
console.log("✅ FFmpeg localizado em:", ffmpegPath);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new Player(client);

async function startBot() {
  await player.extractors.loadMulti(DefaultExtractors);

  client.once("ready", () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
  });

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    const args = message.content.trim().split(" ");
    const command = args.shift().toLowerCase();

    if (command === "!play") {
      const query = args.join(" ");
      if (!query) return message.reply("🔍 Forneça o nome ou link da música.");

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel)
        return message.reply("❌ Você precisa estar em um canal de voz!");

      const searchResult = await player.search(query, {
        requestedBy: message.author,
      });

      if (!searchResult || !searchResult.tracks.length)
        return message.reply("❌ Música não encontrada.");

      const queue = player.nodes.create(message.guild, {
        metadata: {
          channel: message.channel,
        },
      });

      try {
        if (!queue.connection) {
          await queue.connect(voiceChannel);
          queue.node.setVolume(80);
          console.log("✅ Conectado ao canal de voz.");
        }
      } catch (err) {
        console.error("❌ Erro ao conectar:", err);
        queue.delete();
        return message.reply("❌ Não consegui entrar no canal de voz!");
      }

      queue.addTrack(searchResult.tracks[0]);
      message.reply(
        `✅ Música adicionada à fila: ${searchResult.tracks[0].title}`,
      );

      if (!queue.isPlaying()) {
        await queue.node.play().catch((error) => {
          console.error("❌ Falha ao iniciar reprodução:", error);
          message.reply("❌ Ocorreu um erro ao tentar tocar a música.");
        });
      }
    }

    if (command === "!skip") {
      const queue = player.nodes.get(message.guild.id);
      if (!queue || !queue.isPlaying())
        return message.reply("❌ Nada tocando.");
      await queue.node.skip();
      message.reply("⏭ Música pulada.");
    }

    if (command === "!stop") {
      const queue = player.nodes.get(message.guild.id);
      if (!queue) return message.reply("❌ Nada para parar.");
      queue.delete();
      message.reply("⏹ Música parada e fila limpa.");
    }
  });

  // 🎧 Eventos
  player.events.on("playerStart", (queue, track) => {
    queue.metadata.channel.send(`🎶 Tocando agora: **${track.title}**`);
  });

  player.events.on("audioTrackAdd", (queue, track) => {
    console.log(`🎵 Track adicionada: ${track.title}`);
  });

  player.events.on("emptyChannel", (queue) => {
    // Comentado para evitar o bot sair automaticamente
    // queue.delete();
    console.log("⚠️ Canal vazio detectado, mas mantendo conexão.");
  });

  player.events.on("disconnect", (queue) => {
    console.log("❌ Desconectado do canal de voz.");
  });

  player.events.on("error", (queue, error) => {
    console.error("❌ Erro no player:", error);
  });

  client.login(
    "MTM1ODA5MjQ0MzU3MTk3ODQzMQ.G17-1P.1Ug4z3CDauJYCg8nrBChEcBYEvZPPrPSaO29Q0",
  );
}

startBot();
