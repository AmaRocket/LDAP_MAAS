FROM python:3.10-slim

# Install nginx and required packages
RUN apt-get update \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt /var/lib/jenkins/workspace/LDAP/
WORKDIR /var/lib/jenkins/workspace/LDAP
RUN pip install -r requirements.txt

# Copy application files
COPY main.py /var/lib/jenkins/workspace/LDAP/
COPY custom-ui.js /var/www/html/


# Set permissions
RUN chown www-data:www-data /var/www/html/custom-ui.js \
    && chmod 644 /var/www/html/custom-ui.js


# Expose port
EXPOSE 5000

# Start services
CMD ["python3", "/var/lib/jenkins/workspace/LDAP/main.py"] 