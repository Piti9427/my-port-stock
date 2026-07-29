import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/clerkAdapter';
import { fetchWithAuth } from '../lib/api';
import { useTranslation } from '../i18n/useTranslation.js';
import { useAgentEvents } from './useAgentEvents';

function tickerFromQuery(searchParams) {
  const value = (searchParams.get('ticker') || '').trim().toUpperCase();
  return /^[A-Z0-9.-]{1,10}$/.test(value) ? value : '';
}

function analysisPayload(result) {
  return result?.analysis?.decision_snapshot ? result.analysis : result;
}

function validatedQuote(payload) {
  const lastPrice = Number(payload?.last_price);
  if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
    throw new Error('Quote response is missing a valid last_price.');
  }
  return { ...payload, last_price: lastPrice };
}

export function useCommandCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getToken } = useAuth();
  const { language } = useTranslation();
  const events = useAgentEvents() || {};
  const initialTicker = tickerFromQuery(searchParams);
  const [workspaceMode, setWorkspaceMode] = useState('analysis');
  const [searchTicker, setSearchTicker] = useState(initialTicker);
  const [ticker, setTicker] = useState(initialTicker);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [decisionMode, setDecisionMode] = useState('Quick Trade');
  const [localAnalysis, setLocalAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeSaving, setTradeSaving] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const analysis = analysisPayload(events.analysisResult) || localAnalysis;

  const loadQuote = async (nextTicker = searchTicker) => {
    setTicker(nextTicker);
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const payload = await fetchWithAuth(`/api/quote/${encodeURIComponent(nextTicker)}`, getToken);
      setQuote(validatedQuote(payload));
    } catch (error) {
      setQuote(null);
      setQuoteError(error.message || 'Quote request failed');
    } finally {
      setQuoteLoading(false);
    }
  };

  const runAnalysis = async ({ manualPrice }) => {
    events.resetAnalysis?.();
    setLocalAnalysis(null);
    setAnalysisError('');
    setAnalysisLoading(true);
    try {
      const result = await fetchWithAuth('/api/analyze', getToken, {
        method: 'POST',
        body: { ticker, decision_mode: decisionMode, manual_price: manualPrice, language },
      });
      setLocalAnalysis(analysisPayload(result));
    } catch (error) {
      setAnalysisError(error.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const sendChat = async (message) => {
    setChatMessages((current) => [...current, { role: 'user', content: message }]);
    setChatError('');
    setChatLoading(true);
    try {
      const result = await fetchWithAuth('/api/chat', getToken, {
        method: 'POST',
        body: { ticker, decision_mode: decisionMode, message, language },
      });
      setChatMessages((current) => [...current, { role: 'assistant', content: result.message || result.error_details }]);
    } catch (error) {
      setChatError(error.message || 'Chat request failed');
    } finally {
      setChatLoading(false);
    }
  };

  const recordTrade = async (body) => {
    setTradeSaving(true);
    setTradeError('');
    try {
      await fetchWithAuth('/api/journal', getToken, { method: 'POST', body });
      setTradeOpen(false);
      navigate(`/journal?ticker=${encodeURIComponent(ticker)}`);
    } catch (error) {
      setTradeError(error.message || 'Trade record failed');
    } finally {
      setTradeSaving(false);
    }
  };

  return {
    analysis,
    analysisError,
    analysisLoading,
    chatError,
    chatLoading,
    chatMessages,
    decisionMode,
    events,
    loadQuote,
    quote,
    quoteError,
    quoteLoading,
    recordTrade,
    runAnalysis,
    searchTicker,
    sendChat,
    setDecisionMode,
    setSearchTicker,
    setTradeOpen,
    setWorkspaceMode,
    ticker,
    tradeError,
    tradeOpen,
    tradeSaving,
    workspaceMode,
    navigate,
  };
}
