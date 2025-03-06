import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import mysql from 'mysql2';
import cors from "cors";  
import multer from 'multer';
import path from 'path';
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import http from "http";
import crypto from 'node:crypto';
import axios from 'axios';



const app = express();
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
  
app.use(express.json());
app.use(cors());  
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
const __filename = fileURLToPath(import.meta.url);


const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');

app.use('/uploads', express.static(uploadsDir));


console.log("Database URL:", process.env.DATABASE_URL);



const db = mysql.createPool({
    uri: process.env.DATABASE_URL, 
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
  });
  

  db.getConnection((err, connection) => {
    if (err) {
      console.error(" Database connection failed:", err);
    } else {
      console.log("✅ Connected to MySQL database!");
      connection.release(); 
    }
  });
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir); 
    },
    filename: (req, file, cb) => {
      
      cb(null, Date.now() + path.extname(file.originalname)); 
    },
  });
  
  const upload = multer({ storage });
  
  
  app.post('/upload', upload.single('profileImage'), (req, res) => {
    if (!req.file) {
      return res.status(400).send({ error: 'No file uploaded' });
    }
  
   
    const fileUrl = `http://av-drones-react-backend-production.up.railway.app/uploads/${req.file.filename}`;
    
   
    res.json({ url: fileUrl });
  });

  app.post('/register', (req, res) => {
    const firstn = req.body.firstn;
    const lastn = req.body.lastn;
    const email = req.body.email;
    const password = req.body.password;
    const hash = hashPassword(password);

    console.log("Received data:", req.body);

    const query1 = "SELECT * FROM user WHERE email = ?";
    const query2 = "INSERT INTO user(name, prenume, email, password_hash) VALUES (?, ?, ?, ?)";

    db.query(query1, [email], (err, result) => {
        if (err) {
            console.error("❌ Database error on SELECT:", err);
            return res.status(500).json({ error: "Database error on SELECT", details: err });
        }

        console.log("SELECT result:", result);

        if (result.length > 0) {
            return res.status(200).json({ message: "Email already taken", error: true });
        }

        db.query(query2, [firstn, lastn, email, hash], (err, result) => {
            if (err) {
                console.error("❌ Database error on INSERT:", err);
                return res.status(500).json({ error: "Database error on INSERT", details: err });
            }

            console.log("✅ User registered:", email);
            return res.status(201).json({ message: "Registration successful!" });
        });
    });
});


app.post('/login_ver',(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    const hash=hashPassword(password);
    db.query(
         "SELECT id,name,prenume,profile,username,email FROM user WHERE email =? AND password_hash=?",
         [email,hash],
         (err,result)=>{
            if(err)
            {
               res.send({err: err})
            }
            else
            {
                if(result.length>0)
                {
                    res.send(JSON.stringify(result))
                }
                else
                {
                    res.send({message:"Wrong email/password combination"})
                }
            }

         }
    );
})
app.post('/profile_url',(req,res)=>{
    const emailn=req.body.emailn;
    db.query("SELECT profile FROM user WHERE email=?",[emailn],(err,result)=>{
        if(err)
        {
            res.send({err:err});
        }
        else
        {
            console.log(re)
            if(result.length>0)
            {
                res.send(JSON.stringify(result))
            }
            else
            {
                res.send({message:"Nu are imagine de profil"})
            }
        }
    })
})
app.post('/profile_set', (req, res) => {
    const emailn = req.body.emailn;
    const urln = req.body.urln;
    console.log("Received email:", emailn);  
    console.log("Received URL:", urln);  
    db.query("UPDATE user SET profile=? WHERE email=?", [urln, emailn], (err, result) => {
        if (err) {
            console.error("Error updating profile:", err);
            res.send({ err: err });
        } else {
            res.send({ message: "Profile updated successfully" });
        }
    });
});
app.post('/change_name',(req,res)=>{
   const name=req.body.name;
   const email=req.body.email;
   console.log("Recived name:",name);
   console.log("Recived name:",email);
   db.query("UPDATE user SET name=? WHERE email=?",[name,email],(err,result)=>{
    if(err)
    {
        console.error("Error new name");
        res.status(401).send({message:"Username already exists"});
    }
    else
    {
        res.send({message:"Name updated"});
    }
   })
});
app.post('/change_email',(req,res)=>{
    const id=req.body.id;
    const email=req.body.email;
    console.log("Recived name:",id);
    console.log("Recived name:",email);
    db.query("UPDATE user SET email=? WHERE id=?",[email,id],(err,result)=>{
        if(err)
        {
            console.log(" SQL Error new email");
        }
        else
        {
            res.send({message:"Email updated"});
        }
    })
});
app.post('/verify_friend_request',(req,res)=>{
    const id_sender=req.body.id_sender;
    const username_receiver=req.body.username_receiver;
    const username_sender=req.body.username_sender;
    if(username_receiver===username_sender)
    {
        return res.status(400).json({
            message: "Same person"
        });
    }
    db.query("SELECT id FROM user WHERE username=?",[username_receiver],(err,result)=>{
           if(err)
            {
                console.error("Error",err);
                return res.status(500).json({ error: "Database error" });
            }
        const id_receiver=result[0].id;
        db.query("SELECT * FROM friend_request WHERE receiver_id=? AND sender_id=?",[id_receiver,id_sender],(err,result)=>{
            if(result.length>0)
            {
                return res.status(400).json({ 
                    message: "Friend request already sent", 
                    customMessage: "Acest utilizator are deja cererea trimisă!"
                });
            }
            else
            {
                db.query("SELECT * FROM friend_request WHERE receiver_id=? AND sender_id=?",[id_sender,id_receiver],(err,result)=>{
                    if(result.length>0)
                     {
                        return res.status(400).json({ 
                            message: "Friend request already sent", 
                            customMessage: "Acest utilizator are deja cererea trimisă!"
                        });
                     }
                     else
                     { 
                        db.query(
                            "SELECT * FROM friends WHERE (username1=? AND username2=?) OR (username1=? AND username2=?)",
                            [username_receiver, username_sender, username_sender, username_receiver],
                            (err, result) => {
                                if (err) {
                                    console.error("Database query error:", err);
                                    return res.status(500).json({ error: "Database error" });
                                }
                        
                                console.log(" Query Result:", result,username_receiver,username_sender); 
                        
                                if (result.length > 0) {
                                    console.log("Users are already friends!");
                                    return res.status(400).json({
                                        message: "Already friends",
                                        customMessage: "You are already friends!"
                                    });
                                }
                        
                                console.log(" Friend request can be sent!");
                                return res.status(200).json({ message: "Friend request can be sent!" });
                            }
                        );
                        
                      
                     }
                })
            }
        })
    })
})
app.post('/add_friend',(req,res)=>{
  const id_sender=req.body.id_sender;
  const username_receiver=req.body.username_reciver;
  
  db.query("SELECT id FROM user WHERE username=?",[username_receiver],(err,result)=>{
    if(err)
    {
        console.error("Error",err);
        return res.status(500).json({ error: "Database error" });
    }
     const id_receiver=result[0].id;
    db.query("SELECT * FROM friend_request WHERE receiver_id=? AND sender_id=?",[id_receiver,id_sender],(err,result)=>{
        console.log("Rezultatul interogării:", result);
        if(result.length>0)
        {
            return res.status(200).json({error:"User already selected"});
        }
        else
        {
            db.query("INSERT INTO friend_request(sender_id,receiver_id,status) VALUES (?,?,'pending')",
                [id_sender,id_receiver],
                (err,ires)=>{
                    if (err) {
                        console.error("Error inserting friend request:", err);
                        return res.status(500).json({ error: "Database error" });
                      }
                
                      return res.status(200).json({ message: "Friend request sent successfully" });
                    }
            );
        }
    });
    
  });

});
app.post("/delete_request",(req,res)=>{
    const username_sender=req.body.username_sender;
    const id_receiver=req.body.id_receiver;
    db.query("SELECT id FROM user WHERE username=?",[username_sender],(err,result)=>{
        if(err)
        {
            console.error("Eroare la interogare");
            return;
        }
        else
        {
            const id_sender=result[0].id;
            db.query("DELETE FROM friend_request WHERE sender_id=? AND receiver_id=?",[id_sender,id_receiver],(err,result)=>{
                if(err)
                {
                    console.error("Eroare la interogarea 2 cu delete");
                    return;
                }
                else
                {
                    res.send({message:"Sters cu succes"});
                }
            })
        }
    })
})
app.post("/accept_friendship",(req,res)=>{
    const username1=req.body.username1;
    const profile1=req.body.profile1;
    const username2=req.body.username2;
    const profile2=req.body.profile2;
    db.query("INSERT INTO friends(username1,profile1,username2,profile2) VALUES (?,?,?,?)",[username1,profile1,username2,profile2],(err,result)=>{
        if(err)
        {
            res.status(500).json({ error: err });
        }
        else
        {
            res.send({message:"Prietenie acceptata"});
        }
    });
});
app.post("/delete_friend",(req,res)=>{
    const username1=req.body.username1;
    const username2=req.body.username2;
    db.query("DELETE FROM friends WHERE (username1 = ? AND username2 = ?) OR (username1 = ? AND username2 = ?)",[username1,username2,username2,username1],(err,result)=>{
        if(err)
        {
            return res.status(500).json({ error: "Database error" });
        }else
        {
            res.send({message:"Sters"});
        }
    })
})
app.post('/get_friends', (req, res) => {
    const username = req.body.search_username;
    let friends = [];

    db.query("SELECT username1, profile1 FROM friends WHERE username2 = ?", [username], (err, result1) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        if (result1.length > 0) {
            result1.forEach(row => {
                friends.push({
                    username: row.username1,
                    profile: row.profile1
                });
            });
        }

        
        db.query("SELECT username2, profile2 FROM friends WHERE username1 = ?", [username], (err, result2) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (result2.length > 0) {
                result2.forEach(row => {
                    friends.push({
                        username: row.username2,
                        profile: row.profile2
                    });
                });
            }
            console.log("Lista de prieteni:", friends);
            res.json({ friends });
        });
    });
});

app.post('/get_requests',(req,res)=>{
   const id=req.body.id_receiver;
   db.query("SELECT sender_id FROM friend_request WHERE receiver_id=? ",[id],(err,result)=>{
       if(result.length===0)
       {
         return res.json([]);
       }
       else
       {
         let requests=[];
         let number=result.length;
         result.forEach(row=>{
            db.query("SELECT username,profile FROM user WHERE id=?",[row.sender_id],(error,dataResult)=>{
                if (error) {
                    console.error("Eroare la interogare users:", err);
                    return res.status(500).json({ error: "Eroare internă la users" });
                }
                if (dataResult.length > 0) {
                    requests.push({
                        id: row.sender_id,
                        info: [dataResult[0].username, dataResult[0].profile]
                    });
                }
                number--;
                if (number === 0) {
                    res.json(requests);
                }
            });
         });
       }
   });
});
app.post('/verify_password',(req,res)=>{
    const id=req.body.id;
    const pass=req.body.pass;
    const hash=hashPassword(pass);
    console.log("Recived id-verify:",id);
    console.log("Recived pass-verify:",pass);
    db.query("SELECT * FROM user WHERE id=? AND password_hash=?",[id,hash],(err,result)=>{
        if(err)
        {
            console.log(err);
        }
        else
        {
            if(result.length>0)
            {
                res.send({message:"Password exists"});
            }
            else
            {
               res.status(401).send({ error: "Password doesn't exist" })
            }
        }
    })
});
app.post('/change_password',(req,res)=>{
    const id=req.body.id;
    const pass=req.body.pass;
    const hash=hashPassword(pass);
    console.log("Recived id_change:",id);
    console.log("Recived pass_change:",pass);
    db.query("UPDATE user SET password_hash=? WHERE id=?",[hash,id],(err,result)=>{
        if(err)
        {
            console.log(err);
        }
        else
        {
            res.send({message:"Password updated"});
        }
    })
});
app.post('/delete_account',(req,res)=>{
    const id=req.body.id;
    console.log("Recivennid:",id);
    db.query("DELETE FROM user WHERE id=?",[id],(err,result)=>{
        if(err)
        {
            console.log(err);
        }
        else
        {
            res.send({message:"Deleted account"});
        }
    })
});
app.post('/verify_username',(req,res)=>{
    const username=req.body.username;
    console.log("Recived id,username",username);
    db.query("SELECT * FROM user WHERE username=?",[username],(err,result)=>{
        if(result.length>0)
        {
            res.status(409).send({ error: "Username already exists" });
        }
        else
        {
            res.send({message: "Usernameul nu exista"});
        }
    })
})
app.post('/change_username',(req,res)=>{
    const id=req.body.id;
    const username=req.body.username;
    db.query("UPDATE user SET username=? WHERE id=?",[username,id],(err,result)=>{
        res.send({message:"Updated"});
    })
})
app.get('/api/search-user', (req, res) => {
    const query = req.query.query || ''; 
    const sql = `SELECT username FROM user WHERE username LIKE ? LIMIT 10`;
  
    db.query(sql, [`%${query}%`], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        res.status(500).send('Server error');
        return;
      }
  
      res.json(results);
    });
  });
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);  
    res.status(500).json({ error: "Something went wrong." });
});
app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  
  setInterval(() => {
    axios.get('https://av-drones-react-backend-production.up.railway.app/health') 
      .then(() => console.log(' Keep-alive ping sent'))
      .catch(err => console.error(' Keep-alive failed:', err.message));
  }, 15000);
app.listen(8081, () => {
    console.log('Backend server is running on http://av-drones-react-backend-production.up.railway.app');
});


