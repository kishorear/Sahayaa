import { apiRequest } from "./queryClient";

export type ChatbotAction = {
  type: 'create_ticket' | 'resolve_ticket';
  data: any;
};

export type ChatbotResponse = {
  message: string;
  action?: ChatbotAction;
};

// Function to send user message to the chatbot API
export async function sendChatbotMessage(message: string): Promise<ChatbotResponse> {
  try {
    const response = await apiRequest('POST', '/api/chatbot', { message });
    return await response.json();
  } catch (error) {
    console.error('Error sending chatbot message:', error);
    throw error;
  }
}

// Function to create a new ticket
export async function createTicket(ticketData: any) {
  try {
    const response = await apiRequest('POST', '/api/tickets', ticketData);
    return await response.json();
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
}

// Function to add a message to an existing ticket
export async function sendTicketMessage(ticketId: number, sender: string, content: string) {
  try {
    const response = await apiRequest('POST', `/api/tickets/${ticketId}/messages`, {
      sender,
      content,
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending ticket message:', error);
    throw error;
  }
}
