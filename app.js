const WebSocket = require('ws');
const axios = require("axios");
const cheerio = require("cheerio");
const sql = require("mssql")
const crypto = require("crypto")
const url = "https://deprem.afad.gov.tr/last-earthquakes.html";

const wss = new WebSocket.Server({ port: 8080 });


require("dotenv").config()





const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
      encrypt: process.env.DB_OPTIONS_ENCRYPT === "true",
      enableArithAbort: true,
    },
  };
  

  sql.connect(config).then(()=>{
    console.log("veri tabanına bağlandı ")
})






async  function  getEarthquakes() {

    try {
        
   
    let { data } = await axios.get(url);
 
    const $ = cheerio.load(data);
    
    let earthquakes = [];
    
    $("table tbody tr").each((i, row) => {
    const columns = $(row).find("td").map((j, col) => $(col).text().trim()).get();

    if (columns.length) {
        const eventLink = $(row).find("td:nth-child(8) a").attr("href");
        const EventID = eventLink ? eventLink.match(/\/event-detail\/(\d+)/)[1] : null;

        earthquakes.push({
        Date: columns[0],   
        Latitude: columns[1],  
        Longitude: columns[2], 
        Depth: columns[3],     
        Type: columns[4], 
        Magnitude: columns[5],  
        Location: columns[6],  
        EventID: EventID,  
        
        });
    }
    });


    sql.query(`SELECT TOP 1 * FROM [Fayturk].[dbo].[Earthquake] ORDER BY [Date] DESC;`).then(veri=>{


const dateStr = veri.recordset[0].Date
const date = new Date(dateStr);

const year = date.getUTCFullYear();
const month = String(date.getUTCMonth() + 1).padStart(2, '0');
const day = String(date.getUTCDate()).padStart(2, '0');
const hours = String(date.getUTCHours()).padStart(2, '0');
const minutes = String(date.getUTCMinutes()).padStart(2, '0');
const seconds = String(date.getUTCSeconds()).padStart(2, '0');

const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;




        if(formattedDate == earthquakes[0].Date){
          
        }else{

            const id = crypto.randomBytes(5).toString('hex'); // 10 karakter için 5 byte yeterli
          
            

            sql.query(`INSERT INTO [dbo].[earthquake]
            ([Date]
            ,[Longitude]
            ,[Latitude]
            ,[Depth]
            ,[Rms]
            ,[Type]
            ,[Magnitude]
            ,[Location]
            ,[EventID])
        VALUES
            ('${earthquakes[0].Date}'
            ,${earthquakes[0].Longitude}
            ,${earthquakes[0].Latitude}
            ,${earthquakes[0].Depth}
            ,NULL
            ,'${earthquakes[0].Type}'
            ,${earthquakes[0].Magnitude}
            ,'${earthquakes[0].Location}'
            ,'${id}')
            `).then(dta=>{
                console.log(earthquakes[0])
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(earthquakes[0]));
                    }
                });
                
            })
        }
    })
   

} catch (error) {
    console.log(404)    
}


}


const loop = setInterval(getEarthquakes, 10000);










wss.on('connection', ws => {
    



    ws.on('close', () => {
        console.log("Bir istemci bağlantıyı kapattı.");
     
    });
});







