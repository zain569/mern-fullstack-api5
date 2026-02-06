import { MongoClient } from "mongodb";

const url = "mongodb+srv://zainnaveed359_db_user:zzaaiinn1.2.3@cluster0.ii7y96v.mongodb.net/?appName=Cluster0";
const dbName = "node-project";
export const collectionName = "to-do"
const client = new MongoClient(url)
export const connection = async()=>{
    const connecet = await client.connect();
    return await connecet.db(dbName);
}