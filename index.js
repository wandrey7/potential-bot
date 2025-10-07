import { loader } from "./loader.js";
import { connect } from "./socket.js";

async function start() {
  const socket = await connect();
  await loader(socket);
}

start();
