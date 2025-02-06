FROM python:3.10-slim

# Install nginx and required packages
RUN apt-get update && apt-get install -y \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt /app/
WORKDIR /app
RUN pip install -r requirements.txt

# Copy application files
COPY main.py /app/
COPY custom-ui.js /var/www/html/
COPY nginx.conf /etc/nginx/sites-available/default

# Set permissions
RUN chown www-data:www-data /var/www/html/custom-ui.js \
    && chmod 644 /var/www/html/custom-ui.js

# Copy start script
COPY start.sh /app/
RUN chmod +x /app/start.sh

# Expose port
EXPOSE 80

# Start services
CMD ["/app/start.sh"] 