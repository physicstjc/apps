const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.static('.'));

app.get('/api/data', async (req, res) => {
    try {
        const dataset_id = "d_dc92b9d107acfa23e1df76b1a33ffb4a";
        const response = await axios.get(`https://data.gov.sg/api/action/datastore_search?resource_id=${dataset_id}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});