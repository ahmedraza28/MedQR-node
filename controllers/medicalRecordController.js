// const MedicalRecord = require('../models/medicalRecord');
// const mongoose = require('mongoose');
// const Grid = require('gridfs-stream');
// const { Readable } = require('stream');

// // Create GridFS stream
// let gfs;
// mongoose.connection.once('open', () => {
//     gfs = Grid(mongoose.connection.db, mongoose.mongo);
//     gfs.collection('uploads');
// });

// exports.uploadRecord = async (req, res) => {
//     try {
//         const { patientId } = req.params;
//         const { originalname, mimetype, buffer } = req.file;

//         const medicalRecord = new MedicalRecord({
//             patient: patientId,
//             filename: originalname,
//             contentType: mimetype,
//             length: buffer.length,
//             data: buffer
//         });

//         await medicalRecord.save();
//         res.status(201).json({ message: 'Medical record uploaded successfully' });
//     } catch (error) {
//         console.error('Error in uploadRecord:', error);
//         res.status(500).json({ error: error.message });
//     }
// };


// exports.getAllRecordsByPatient = async (req, res) => {
//     try {
//         const { patientId } = req.params;
//         const medicalRecords = await MedicalRecord.find({ patient: patientId });

//         if (medicalRecords.length === 0) {
//             return res.status(404).json({ message: 'No medical records found for this patient' });
//         }

//         const recordsWithImages = await Promise.all(medicalRecords.map(async record => {
//             const readableStream = new Readable();
//             readableStream._read = () => {}; // Necessary to satisfy Readable Stream API
//             readableStream.push(record.data);
//             readableStream.push(null);

//             const bufferData = await streamToBuffer(readableStream);
//             const base64Data = bufferData.toString('base64');

//             return {
//                 _id: record._id,
//                 filename: record.filename,
//                 contentType: record.contentType,
//                 data: base64Data
//             };
//         }));

//         res.status(200).json({ medicalRecords: recordsWithImages });
//     } catch (error) {
//         console.error('Error in getAllRecordsByPatient:', error);
//         res.status(500).json({ error: error.message });
//     }
// };

// // Utility function to convert stream to buffer
// function streamToBuffer(stream) {
//     return new Promise((resolve, reject) => {
//         const chunks = [];
//         stream.on('data', chunk => chunks.push(chunk));
//         stream.on('error', reject);
//         stream.on('end', () => resolve(Buffer.concat(chunks)));
//     });
// }




const MedicalRecord = require('../models/medicalRecord');
const Patient = require('../models/patient');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const { Readable } = require('stream');
const crypto = require('crypto');
const nodeSchedule = require('node-schedule');

// Create GridFS stream
let gfs;
mongoose.connection.once('open', () => {
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection('uploads');
});

// Utility function to convert stream to buffer
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

// Temporary storage for tokens
const tempTokenStore = new Map();

exports.uploadRecord = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { originalname, mimetype, buffer } = req.file;

        const medicalRecord = new MedicalRecord({
            patient: patientId,
            filename: originalname,
            contentType: mimetype,
            length: buffer.length,
            data: buffer
        });

        await medicalRecord.save();
        res.status(201).json({ message: 'Medical record uploaded successfully' });
    } catch (error) {
        console.error('Error in uploadRecord:', error);
        res.status(500).json({ error: error.message });
    }
};

// Modified getAllRecordsByPatient to be reusable
async function getAllRecordsByPatient(patientId) {
    try {
        const medicalRecords = await MedicalRecord.find({ patient: patientId });
        if (medicalRecords.length === 0) {
            return [];
        }

        return Promise.all(medicalRecords.map(async record => {
            const readableStream = new Readable();
            readableStream._read = () => {};
            readableStream.push(record.data);
            readableStream.push(null);

            const bufferData = await streamToBuffer(readableStream);
            const base64Data = bufferData.toString('base64');

            return {
                _id: record._id,
                filename: record.filename,
                contentType: record.contentType,
                data: base64Data
            };
        }));
    } catch (error) {
        console.error('Error in getAllRecordsByPatient:', error);
        throw new Error(error.message);
    }
}

exports.generateTemporaryLink = async (req, res) => {
    try {
        const { patientId } = req.params;
        const token = crypto.randomBytes(20).toString('hex');
        const linkExpirationDate = new Date(Date.now() + 120000); // 2 minutes from now

        tempTokenStore.set(token, { patientId, expires: linkExpirationDate });

        // Schedule token deletion
        nodeSchedule.scheduleJob(linkExpirationDate, () => {
            tempTokenStore.delete(token);
        });

        const link = `${req.protocol}://${req.get('host')}/api/medical-records/temporary/${token}`;
        res.status(200).json({ message: 'Temporary link generated successfully', link });
    } catch (error) {
        console.error('Error in generateTemporaryLink:', error);
        res.status(500).json({ error: error.message });
    }
};

// exports.accessTemporaryLink = async (req, res) => {
//     try {
//         const { token } = req.params;
//         const tokenData = tempTokenStore.get(token);

//         if (!tokenData || new Date() > tokenData.expires) {
//             return res.status(404).json({ message: 'Link is invalid or has expired' });
//         }

//         tempTokenStore.delete(token); // Invalidate token

//         const medicalRecords = await getAllRecordsByPatient(tokenData.patientId);
//         res.status(200).json({ medicalRecords });
//     } catch (error) {
//         console.error('Error in accessTemporaryLink:', error);
//         res.status(500).json({ error: error.message });
//     }
// };

exports.accessTemporaryLink = async (req, res) => {
    try {
        const { token } = req.params;
        const tokenData = tempTokenStore.get(token);

        if (!tokenData || new Date() > tokenData.expires) {
            return res.status(404).json({ message: 'Link is invalid or has expired' });
        }
        // trying thing out
        // tempTokenStore.delete(token); // Invalidate token 

        // Fetch the patient's name
        const patient = await Patient.findById(tokenData.patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        const patientName = patient.name; // Assuming the patient's name field is `name`

        const medicalRecords = await getAllRecordsByPatient(tokenData.patientId);


        let imagesHtml = '';
        medicalRecords.forEach(record => {
            imagesHtml += `
                <div>
                    <h2>${record.filename}</h2>
                    <img src="data:${record.contentType};base64,${record.data}" alt="${record.filename}" style="width:100%;">
                </div>
            `;
        });

        // const html = `
        //     <!DOCTYPE html>
        //     <html>
        //     <head>
        //         <title>Medical Records for ${patientName}</title>
        //     </head>
        //     <body>
        //         <h1>${patientName}</h1>
        //         ${imagesHtml}
        //     </body>
        //     </html>
        // `;

        const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Medical Records for ${patientName}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background-color: #fff;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
                color: #333;
            }
            h2 {
                color: #666;
            }
            img {
                max-width: 100%;
                height: auto;
                margin-bottom: 10px;
                border-radius: 5px;
                box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${patientName}'s Medical Records</h1>
            ${imagesHtml}
        </div>
    </body>
    </html>
`;


        res.send(html);
    } catch (error) {
        console.error('Error in accessTemporaryLink:', error);
        res.status(500).json({ error: error.message });
    }
};

// Generate and store a 6-digit code corresponding to the patient's email
exports.generateVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;
        // Generate a random 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000);
        // Store the code with the email for 2 minutes
        tempTokenStore.set(code, { email, expires: Date.now() + 120000 });
        console.log(tempTokenStore);

        res.status(200).json({ message: 'Verification code generated successfully', code });
    } catch (error) {
        console.error('Error in generateVerificationCode:', error);
        res.status(500).json({ error: error.message });
    }
};

// Validate the provided code and retrieve records if it matches
exports.verifyCodeAndRetrieveRecords = async (req, res) => {
    try {
        var { code } = req.body; // Assuming the code is sent in the request body
        code = parseInt(code);
        const storedData = tempTokenStore.get(code);
        
        if (!storedData || Date.now() > storedData.expirationTime) {
            return res.status(404).json({ message: 'Code is invalid or has expired' });
        }

        // Retrieve patient by email
        const patient = await Patient.findOne({ email: storedData.email });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Compare the provided code with the stored code
        if (parseInt(code) === parseInt(code)) {
            const medicalRecords = await getAllRecordsByPatient(patient._id);
            return res.status(200).json({ medicalRecords });
        } else {
            return res.status(401).json({ message: 'Code is incorrect' });
        }
    } catch (error) {
        console.error('Error in verifyCodeAndRetrieveRecords:', error);
        res.status(500).json({ error: error.message });
    }
};
