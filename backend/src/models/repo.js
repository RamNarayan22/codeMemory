import mongoose from 'mongoose';

const repoModel = new mongoose.Schema({
    url:{
        type:String,
        required : true,

    },
    name:{
        type:String
    },
    status:{
        type:String,
        default:"Pending"
    },
    commitCount: { type: Number, default: 0 },
    errorMessage: { type: String },
},{timestamps:true})


const repoSchema= mongoose.model('Repo',repoModel)
export default repoSchema