const pool = require('../config/database');

const getRiskScores = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, COUNT(*) as total_events, SUM(CASE WHEN threat_type = 'ARMED' THEN 3 ELSE 1 END) as risk_score, SUM(CASE WHEN threat_type = 'ARMED' THEN 1 ELSE O END) as armed_count, SUM(CASE WHEN threat_type = 'UNARMED' THEN 1 ELSE 0 END) as unarmed_count, MAX(created_at) as last_incident FROM sos_events WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY ST_X(location::geometry), ST_Y(location::geometry) ORDER BY risk_score DESC LIMIT 20`
        );

        const riskAreas = result.rows.map(row => ({
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            risk_score: parseInt(row.risk_score),
            total_events: parseInt(row.total_events),
            armed_count: parseInt(row.armed_count),
            unarmed_count: parseInt(row.unarmed_count),
            last_incident: row.last_incident,
            risk_level: row.risk_score >= 6 ? 'HIGH' : row.risk_score >=3 ? 'MEDIUM' : 'LOW'
        }));

        res.json({ risk_areas: riskAreas });

    } catch (error) {
        console.error('Risk score error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getRiskScores };