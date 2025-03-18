const { MongoClient } = require("mongodb");

//connection uri
const uri = "mongodb+srv://drverma2704:AavYzM7b818uX6uH@giftwala.x1ywjoh.mongodb.net/";

// Create a new mongoClient
const client = new MongoClient(uri);

async function run() {
    try{
        await client.connect(); //Connect to the database
        console.log("Connected to MongoDB!");

        const database = client.db("testdb");
        const collection = database.collection("users"); //Collection name
        

        //Insert a sample document
        const result = await collection.insertOne( { name : "John Doe", age : 25 });
        console.log("Inserted Document ID:", result.insertedId);


        //Fetch all documents
        const users = await collection.find().toArray();
        console.log("Users:", users);
    }
    
    catch(err){
        console.log("Error: ", err);
    }
    finally {
        await client.close(); //Close the connection
    }
}

run();