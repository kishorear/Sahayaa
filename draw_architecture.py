from PIL import Image, ImageDraw, ImageFont
import os

def create_architecture_diagram():
    # Create a new white background image
    width, height = 1200, 1600
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)
    
    # Create basic fonts - use system fonts
    try:
        title_font = ImageFont.truetype("Arial", 28)
        section_font = ImageFont.truetype("Arial", 20)
        component_font = ImageFont.truetype("Arial", 14)
    except IOError:
        # Fallback to default font if Arial is not available
        title_font = ImageFont.load_default()
        section_font = ImageFont.load_default()
        component_font = ImageFont.load_default()
    
    # Draw title
    title = "AI-Powered Support Ticket System Architecture"
    draw.text((width // 2, 50), title, fill="black", font=title_font, anchor="mm")
    
    # Define box dimensions
    box_width, box_height = 300, 300
    padding = 100
    
    # Draw Client Layer
    client_x, client_y = 40, 100
    draw.rectangle([client_x, client_y, client_x + box_width, client_y + box_height], outline="black", width=2)
    draw.text((client_x + box_width // 2, client_y + 30), "Client Layer", fill="black", font=section_font, anchor="mm")
    
    components = ["Customer Web UI", "Embedded Chat Widget", "Email Interface", "Admin Dashboard"]
    for i, component in enumerate(components):
        comp_y = client_y + 80 + i * 50
        draw.rectangle([client_x + 30, comp_y, client_x + box_width - 30, comp_y + 40], outline="gray")
        draw.text((client_x + box_width // 2, comp_y + 20), component, fill="black", font=component_font, anchor="mm")
    
    # Draw Authentication Layer
    auth_x, auth_y = 440, 100
    draw.rectangle([auth_x, auth_y, auth_x + box_width, auth_y + box_height], outline="black", width=2)
    draw.text((auth_x + box_width // 2, auth_y + 30), "Authentication Layer", fill="black", font=section_font, anchor="mm")
    
    components = ["User Authentication", "API Key Authentication", "Session Management", "MFA + SSO Services"]
    for i, component in enumerate(components):
        comp_y = auth_y + 80 + i * 50
        draw.rectangle([auth_x + 30, comp_y, auth_x + box_width - 30, comp_y + 40], outline="gray")
        draw.text((auth_x + box_width // 2, comp_y + 20), component, fill="black", font=component_font, anchor="mm")
    
    # Draw Core Services
    core_x, core_y = 840, 100
    draw.rectangle([core_x, core_y, core_x + box_width, core_y + box_height], outline="black", width=2)
    draw.text((core_x + box_width // 2, core_y + 30), "Core Services", fill="black", font=section_font, anchor="mm")
    
    components = ["Ticket Service", "Chat Service", "User Service", "Tenant Service"]
    for i, component in enumerate(components):
        comp_y = core_y + 80 + i * 50
        draw.rectangle([core_x + 30, comp_y, core_x + box_width - 30, comp_y + 40], outline="gray")
        draw.text((core_x + box_width // 2, comp_y + 20), component, fill="black", font=component_font, anchor="mm")
    
    # Draw AI Engine
    ai_x, ai_y = 40, 450
    draw.rectangle([ai_x, ai_y, ai_x + box_width, ai_y + box_height + 50], outline="black", width=2)
    draw.text((ai_x + box_width // 2, ai_y + 30), "AI Engine", fill="black", font=section_font, anchor="mm")
    
    components = ["AI Provider Factory", "OpenAI Provider", "Gemini Provider", "Anthropic Provider", "AWS Bedrock Provider", "Custom Provider"]
    for i, component in enumerate(components):
        comp_y = ai_y + 80 + i * 50
        draw.rectangle([ai_x + 30, comp_y, ai_x + box_width - 30, comp_y + 40], outline="gray")
        draw.text((ai_x + box_width // 2, comp_y + 20), component, fill="black", font=component_font, anchor="mm")
    
    # Draw External Integrations
    ext_x, ext_y = 440, 450
    draw.rectangle([ext_x, ext_y, ext_x + box_width, ext_y + box_height - 50], outline="black", width=2)
    draw.text((ext_x + box_width // 2, ext_y + 30), "External Integrations", fill="black", font=section_font, anchor="mm")
    
    components = ["Zendesk", "Jira", "Email Service"]
    for i, component in enumerate(components):
        comp_y = ext_y + 80 + i * 50
        draw.rectangle([ext_x + 30, comp_y, ext_x + box_width - 30, comp_y + 40], outline="gray")
        draw.text((ext_x + box_width // 2, comp_y + 20), component, fill="black", font=component_font, anchor="mm")
    
    # Draw Storage Layer
    storage_x, storage_y = 840, 450
    draw.rectangle([storage_x, storage_y, storage_x + box_width, storage_y + box_height - 50], outline="black", width=2)
    draw.text((storage_x + box_width // 2, storage_y + 30), "Storage Layer", fill="black", font=section_font, anchor="mm")
    
    components = ["PostgreSQL", "Memory Fallback", "Data Source Cache"]
    for i, component in enumerate(components):
        comp_y = storage_y + 80 + i * 50
        draw.rectangle([storage_x + 30, comp_y, storage_x + box_width - 30, comp_y + 40], outline="gray")
        draw.text((storage_x + box_width // 2, comp_y + 20), component, fill="black", font=component_font, anchor="mm")
    
    # Draw Knowledge Sources
    knowledge_x, knowledge_y = 40, 850
    draw.rectangle([knowledge_x, knowledge_y, knowledge_x + box_width, knowledge_y + box_height - 80], outline="black", width=2)
    draw.text((knowledge_x + box_width // 2, knowledge_y + 30), "Knowledge Sources", fill="black", font=section_font, anchor="mm")
    
    components = ["Knowledge Base", "URL Content", "Custom Data Sources"]
    for i, component in enumerate(components):
        comp_y = knowledge_y + 80 + i * 50
        draw.rectangle([knowledge_x + 30, comp_y, knowledge_x + box_width - 30, comp_y + 40], outline="gray")
        draw.text((knowledge_x + box_width // 2, comp_y + 20), component, fill="black", font=component_font, anchor="mm")
    
    # Draw Multi-Tenant Support
    tenant_x, tenant_y = 840, 850
    draw.rectangle([tenant_x, tenant_y, tenant_x + box_width, tenant_y + box_height - 80], outline="black", width=2)
    draw.text((tenant_x + box_width // 2, tenant_y + 30), "Multi-Tenant Support", fill="black", font=section_font, anchor="mm")
    
    components = ["Tenant Settings", "Branding/Theme", "Domain Configuration"]
    for i, component in enumerate(components):
        comp_y = tenant_y + 80 + i * 50
        draw.rectangle([tenant_x + 30, comp_y, tenant_x + box_width - 30, comp_y + 40], outline="gray")
        draw.text((tenant_x + box_width // 2, comp_y + 20), component, fill="black", font=component_font, anchor="mm")
    
    # Draw Process Flow section
    draw.text((width // 2, 1120), "Process Flow: Ticket Handling", fill="black", font=section_font, anchor="mm")
    
    # Draw flow diagram
    flow_x, flow_y = 150, 1150
    flow_width, flow_height = 900, 400
    draw.rectangle([flow_x, flow_y, flow_x + flow_width, flow_y + flow_height], outline="black")
    
    # Draw flow steps
    steps = [
        {"x": 500, "y": 1205, "text": "User Query", "color": "lightblue"},
        {"x": 500, "y": 1285, "text": "API Gateway", "color": "lightblue"},
        {"x": 500, "y": 1365, "text": "AI Classification", "color": "lightblue"},
        {"x": 350, "y": 1445, "text": "Auto-resolve", "color": "lightgreen"},
        {"x": 650, "y": 1445, "text": "Human Support", "color": "pink"},
        {"x": 350, "y": 1525, "text": "Notify User", "color": "lightgreen"},
        {"x": 650, "y": 1525, "text": "Notify User", "color": "pink"}
    ]
    
    for step in steps:
        # Draw rounded rectangle (approximated with rectangle for simplicity)
        x, y = step["x"], step["y"]
        color = step.get("color", "white")
        color_map = {
            "lightblue": (227, 242, 253),
            "lightgreen": (232, 245, 233),
            "pink": (252, 228, 236),
            "white": (255, 255, 255)
        }
        draw.rectangle([x - 70, y - 25, x + 70, y + 15], 
                      fill=color_map.get(color, (255, 255, 255)), 
                      outline="black")
        draw.text((x, y), step["text"], fill="black", font=component_font, anchor="mm")
    
    # Draw connecting arrows
    # To keep it simple, just draw straight lines
    draw.line([500, 1220, 500, 1260], fill="black", width=2)
    draw.line([500, 1300, 500, 1340], fill="black", width=2)
    draw.line([430, 1360, 350, 1420], fill="black", width=2)
    draw.line([570, 1360, 650, 1420], fill="black", width=2)
    draw.line([350, 1460, 350, 1500], fill="black", width=2)
    draw.line([650, 1460, 650, 1500], fill="black", width=2)
    
    # Save the image
    image.save('architecture-diagram.png')
    print(f"Diagram saved to {os.path.abspath('architecture-diagram.png')}")

if __name__ == "__main__":
    try:
        create_architecture_diagram()
    except Exception as e:
        print(f"Error creating diagram: {e}")