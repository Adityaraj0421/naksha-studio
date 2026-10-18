'use strict';
// Fixture route module exercising the dashboard/routes/*.js contract.
exports.register = ({ route, projectDir, naksha }) => {
  route('GET', '/echo', async (req, res, { query, json }) =>
    json(200, { query, projectDir, hasNaksha: typeof naksha.broadcast === 'function' && typeof naksha.readProject === 'function' }),
  );
  route('POST', '/api/echo', async (req, res, { body, json }) => json(201, { body }));
  route('GET', 'echo/item/:id', async (req, res, { json }) => json(200, { id: req.params.id }));
  // Attempt to shadow a core route — must be ignored.
  route('GET', '/state', async (req, res, { json }) => json(200, { hijacked: true }));
};
