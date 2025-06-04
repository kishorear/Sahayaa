"""
Test script to check the exact schema of the existing database.
"""

import os
import psycopg2
import psycopg2.extras
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_database_schema():
    """Check the actual schema of existing tables."""
    try:
        DATABASE_URL = os.getenv("DATABASE_URL")
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        cursor = conn.cursor()
        
        # Check tickets table schema
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'tickets' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        """)
        ticket_columns = cursor.fetchall()
        
        logger.info("TICKETS table schema:")
        for col in ticket_columns:
            logger.info(f"  {col['column_name']}: {col['data_type']} ({'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'})")
        
        # Check messages table schema
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        """)
        message_columns = cursor.fetchall()
        
        logger.info("\nMESSAGES table schema:")
        for col in message_columns:
            logger.info(f"  {col['column_name']}: {col['data_type']} ({'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'})")
        
        # Test actual data query with correct column names
        cursor.execute("""
            SELECT id, title, status, category, "createdAt", "updatedAt"
            FROM tickets 
            ORDER BY "createdAt" DESC 
            LIMIT 3
        """)
        recent_tickets = cursor.fetchall()
        
        logger.info("\nSample tickets with correct column names:")
        for ticket in recent_tickets:
            logger.info(f"  ID: {ticket['id']}, Title: {ticket['title'][:30]}..., Created: {ticket['createdAt']}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"Schema check failed: {e}")
        return False

if __name__ == "__main__":
    check_database_schema()