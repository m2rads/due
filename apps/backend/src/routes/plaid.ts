import { Router } from 'express';
import { 
  createLinkToken, 
  exchangePublicToken, 
  getBalance, 
  getRecurringTransactions,
  getBankConnections,
  unlinkBankConnection
} from '../controllers/plaid';
import { authenticateUser } from '../middleware/auth';

/**
 * @openapi
 * components:
 *   schemas:
 *     BankConnection:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         plaidAccessToken:
 *           type: string
 *         plaidItemId:
 *           type: string
 *         institutionId:
 *           type: string
 *         institutionName:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         itemStatus:
 *           type: string
 *         errorCode:
 *           type: string
 *         errorMessage:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         deletedAt:
 *           type: string
 *           format: date-time
 *         deleteReason:
 *           type: string
 */

const router = Router();

/**
 * @openapi
 * /api/plaid/create_link_token:
 *   post:
 *     summary: Create a Plaid Link token
 *     tags: [Plaid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: string
 *                 description: Client address (localhost or mobile)
 *     responses:
 *       200:
 *         description: Link token created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 link_token:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post('/create_link_token', createLinkToken);

/**
 * @openapi
 * /api/plaid/exchange_public_token:
 *   post:
 *     summary: Exchange public token for access token and create bank connection
 *     tags: [Plaid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - public_token
 *               - institutionId
 *             properties:
 *               public_token:
 *                 type: string
 *               institutionId:
 *                 type: string
 *               institutionName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token exchanged and connection created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 connection:
 *                   $ref: '#/components/schemas/BankConnection'
 *       409:
 *         description: Duplicate connection
 *       400:
 *         description: Invalid request or Plaid error
 */
router.post('/exchange_public_token', exchangePublicToken);

// Protected routes
router.use(authenticateUser);

/**
 * @openapi
 * /api/plaid/bank-connections:
 *   get:
 *     summary: Get user's bank connections
 *     tags: [Plaid]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of bank connections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connections:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BankConnection'
 */
router.get('/bank-connections', getBankConnections);

/**
 * @openapi
 * /api/plaid/bank-connections/{id}:
 *   delete:
 *     summary: Unlink a bank connection
 *     tags: [Plaid]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connection unlinked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
router.delete('/bank-connections/:id', unlinkBankConnection);

/**
 * @openapi
 * /api/plaid/recurring_transactions:
 *   post:
 *     summary: Get recurring transactions from all connected banks
 *     tags: [Plaid]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Recurring transactions retrieved successfully
 *       400:
 *         description: No active connections or failed to fetch transactions
 */
router.post('/recurring_transactions', getRecurringTransactions);

/**
 * @openapi
 * /api/plaid/balance:
 *   post:
 *     summary: Get account balances
 *     tags: [Plaid]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Account balances retrieved successfully
 *       400:
 *         description: No access token found
 */
router.post('/balance', getBalance);

export default router;