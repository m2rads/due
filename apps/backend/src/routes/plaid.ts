import { Router } from 'express';
import { createLinkToken, exchangePublicToken, getBalance, getRecurringTransactions } from '../controllers/plaid';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.post('/create_link_token', createLinkToken);
router.post('/exchange_public_token', exchangePublicToken);
router.post('/balance', getBalance);
router.post('/recurring_transactions', getRecurringTransactions);

export default router;