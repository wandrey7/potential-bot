export const loader = async (socket) => {
  socket.ev.on("messages.upsert", async ({ type, messages }) => {
    if (type == "notify") {
      for (const message of messages) {
        // messages is an array, do not just handle the first message, you will miss messages
        console.log("New message:", message);

        // Obtain the target JID and try to convert to LID if it's a PN
        let targetJid = message.key.remoteJid;
        const isLid = targetJid.includes("@lid");

        if (!isLid) {
          const lid =
            socket.signalRepository?.lidMapping?.getLIDForPN(targetJid);
          if (lid) {
            targetJid = lid;
          }
        }
        await socket.sendMessage(targetJid, {
          react: {
            text: "👍",
            key: message.key,
          },
        });
      }
    } else {
      console.log("Unhandled message type:", type);
    }
  });
};
