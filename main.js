const express = require('express');
const axios = require('axios');
const { FILLOUT_API_KEY, FILLOUT_API_URL } = require('./constants');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/:formId/filteredResponses', async (req, res) => {
  try {
    const { formId } = req.params;
    const { filters, page = 1, perPage = 10, ...queryParams } = req.query;

    // Parse the JSON stringified filters
    const filterConditions = JSON.parse(filters);

    // Fetch responses from Fillout.com API
    const apiUrl = `${FILLOUT_API_URL}/${formId}/submissions`;
    const response = await axios.get(apiUrl, {
      params: queryParams,
      headers: {
        Authorization: `Bearer ${FILLOUT_API_KEY}`
      }
    });

    // Filter the data
    const filteredResponses = response.data.responses.filter(submission => {
      return filterConditions.every(filter => {
        const question = submission.questions.find(q => q.id === filter.id);
        if (!question) return false;

        switch (filter.condition) {
          case 'equals':
            return question.value === filter.value;
          case 'does_not_equal':
            return question.value !== filter.value;
          case 'greater_than':
            return compareValues(question.value, filter.value) > 0;
          case 'less_than':
            return compareValues(question.value, filter.value) < 0;
          default:
            return false;
        }
      });
    });

    function compareValues(value1, value2) {
      if (typeof value1 === 'string' && typeof value2 === 'string') {
        // Compare strings
        return value1.localeCompare(value2);
      } else if (!isNaN(parseFloat(value1)) && !isNaN(parseFloat(value2))) {
        // Compare numbers
        return parseFloat(value1) - parseFloat(value2);
      } else {
        // Compare dates
        return new Date(value1) - new Date(value2);
      }
    }

    // Calculate total responses and page count
    const totalResponses = filteredResponses.length;
    const pageCount = Math.ceil(totalResponses / perPage);

    // Pagination
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedResponses = filteredResponses.slice(startIndex, endIndex);

    res.json({
      responses: paginatedResponses,
      totalResponses,
      pageCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
