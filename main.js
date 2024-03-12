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

    if (!filters) {
      // No filters provided, return entire response with default pagination
      const apiUrl = `${FILLOUT_API_URL}/${formId}/submissions`;
      const response = await axios.get(apiUrl, {
        params: queryParams,
        headers: {
          Authorization: `Bearer ${FILLOUT_API_KEY}`
        }
      });

      const startIndex = (page - 1) * perPage;
      const endIndex = page * perPage;
      const paginatedResponses = response.data.responses.slice(startIndex, endIndex);

      res.json({
        responses: paginatedResponses,
        totalResponses: response.data.responses.length,
        pageCount: Math.ceil(response.data.responses.length / perPage),
        currentPage: page,
        perPage: perPage
      });
    } else {
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
              return Number(question.value) > Number(filter.value);
            case 'less_than':
              return Number(question.value) < Number(filter.value);
            default:
              return false;
          }
        });
      });

      // Paginate the filtered responses
      const startIndex = (page - 1) * perPage;
      const endIndex = page * perPage;
      const paginatedResponses = filteredResponses.slice(startIndex, endIndex);

      res.json({
        responses: paginatedResponses,
        totalResponses: filteredResponses.length,
        pageCount: Math.ceil(filteredResponses.length / perPage),
        currentPage: Number(page),
        perPage: Number(perPage)
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
