"""
Metrics Collector for FastMCP Service
Lightweight metrics collection and storage.
"""

import time
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict, deque
import threading

logger = logging.getLogger(__name__)

class MetricsCollector:
    """Lightweight metrics collector with memory storage."""
    
    def __init__(self, max_history_hours: int = 24):
        self.max_history_hours = max_history_hours
        self.lock = threading.Lock()
        
        # Metrics storage
        self.counters = defaultdict(int)
        self.timings = defaultdict(list)
        self.events = deque(maxlen=1000)  # Keep last 1000 events
        
        # Performance tracking
        self.request_history = deque(maxlen=10000)  # Last 10k requests
        
        logger.info("Metrics collector initialized")
    
    def _cleanup_old_data(self):
        """Remove old timing data to prevent memory growth."""
        cutoff_time = datetime.utcnow() - timedelta(hours=self.max_history_hours)
        
        for key in list(self.timings.keys()):
            # Keep only recent timings
            self.timings[key] = [
                (timestamp, value) for timestamp, value in self.timings[key]
                if timestamp > cutoff_time
            ]
            
            # Remove empty lists
            if not self.timings[key]:
                del self.timings[key]
    
    def record_ingestion(self, document_count: int, processing_time: float):
        """Record document ingestion metrics."""
        with self.lock:
            timestamp = datetime.utcnow()
            
            self.counters['total_documents_ingested'] += document_count
            self.counters['total_ingestion_requests'] += 1
            
            self.timings['ingestion_time'].append((timestamp, processing_time))
            self.timings['documents_per_request'].append((timestamp, document_count))
            
            self.events.append({
                'type': 'ingestion',
                'timestamp': timestamp.isoformat(),
                'document_count': document_count,
                'processing_time': processing_time
            })
            
            self._cleanup_old_data()
    
    def record_search(self, result_count: int, processing_time: float):
        """Record search metrics."""
        with self.lock:
            timestamp = datetime.utcnow()
            
            self.counters['total_search_requests'] += 1
            self.counters['total_results_returned'] += result_count
            
            self.timings['search_time'].append((timestamp, processing_time))
            self.timings['results_per_search'].append((timestamp, result_count))
            
            self.events.append({
                'type': 'search',
                'timestamp': timestamp.isoformat(),
                'result_count': result_count,
                'processing_time': processing_time
            })
            
            self._cleanup_old_data()
    
    def record_agent_request(self, agent_type: str, processing_time: float):
        """Record agent request metrics."""
        with self.lock:
            timestamp = datetime.utcnow()
            
            self.counters[f'agent_requests_{agent_type}'] += 1
            self.counters['total_agent_requests'] += 1
            
            self.timings[f'agent_time_{agent_type}'].append((timestamp, processing_time))
            
            self.events.append({
                'type': 'agent_request',
                'timestamp': timestamp.isoformat(),
                'agent_type': agent_type,
                'processing_time': processing_time
            })
            
            self._cleanup_old_data()
    
    def record_error(self, error_type: str, details: str = None):
        """Record error metrics."""
        with self.lock:
            timestamp = datetime.utcnow()
            
            self.counters[f'errors_{error_type}'] += 1
            self.counters['total_errors'] += 1
            
            self.events.append({
                'type': 'error',
                'timestamp': timestamp.isoformat(),
                'error_type': error_type,
                'details': details
            })
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics summary."""
        with self.lock:
            # Calculate averages for recent data
            now = datetime.utcnow()
            one_hour_ago = now - timedelta(hours=1)
            
            # Recent performance metrics
            recent_search_times = [
                time_val for timestamp, time_val in self.timings.get('search_time', [])
                if timestamp > one_hour_ago
            ]
            
            recent_ingestion_times = [
                time_val for timestamp, time_val in self.timings.get('ingestion_time', [])
                if timestamp > one_hour_ago
            ]
            
            return {
                'timestamp': now.isoformat(),
                'counters': dict(self.counters),
                'performance': {
                    'avg_search_time_ms': round(sum(recent_search_times) * 1000 / len(recent_search_times), 2) if recent_search_times else 0,
                    'avg_ingestion_time_ms': round(sum(recent_ingestion_times) * 1000 / len(recent_ingestion_times), 2) if recent_ingestion_times else 0,
                    'searches_last_hour': len(recent_search_times),
                    'ingestions_last_hour': len(recent_ingestion_times)
                },
                'recent_events': list(self.events)[-10:],  # Last 10 events
                'uptime_hours': round((now - self.start_time).total_seconds() / 3600, 2) if hasattr(self, 'start_time') else 0
            }
    
    def start_tracking(self):
        """Start tracking uptime."""
        self.start_time = datetime.utcnow()
        logger.info("Metrics tracking started")