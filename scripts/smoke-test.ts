const PRODUCTION_URL = process.env.PRODUCTION_URL

if(!PRODUCTION_URL){
    throw new Error(" URL is missing")
}
