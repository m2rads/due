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

const router = Router();

// Public routes
router.post('/create_link_token', createLinkToken);
router.post('/exchange_public_token', exchangePublicToken);

// Protected routes
router.use(authenticateUser);
router.get('/bank-connections', getBankConnections);
router.delete('/bank-connections/:id', unlinkBankConnection);
router.post('/balance', getBalance);
router.post('/recurring_transactions', getRecurringTransactions);

export default router;