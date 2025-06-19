import { counterValue } from "../store";
import { config } from "./config";

export const updateCurrentCounter = async() => {
    const request = await fetch(`${config.nodeUrl}/abci_query?path=%22/get/con_counter.counter%22`);
    const data = await request.json();
    // @ts-ignore
    const value = data.result.response.value
    console.log(value);
    counterValue.set(parseInt(atob(value)) || 0);
}