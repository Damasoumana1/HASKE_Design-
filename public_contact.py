"""Public information shared by local and stateless deployments."""
import os


def contact_details():
    networks = [('Facebook', 'SOCIAL_FACEBOOK'), ('Instagram', 'SOCIAL_INSTAGRAM'),
                ('TikTok', 'SOCIAL_TIKTOK'), ('LinkedIn', 'SOCIAL_LINKEDIN'), ('YouTube', 'SOCIAL_YOUTUBE')]
    defaults = {'SOCIAL_FACEBOOK': 'https://www.facebook.com/share/19f3hLtCKi/?mibextid=wwXIfr',
                'SOCIAL_TIKTOK': 'https://www.tiktok.com/@haske_communication?_r=1&_t=ZS-9B2dWwfbnAm',
                'SOCIAL_LINKEDIN': 'https://www.linkedin.com/'}
    return {
        'email': os.environ.get('CONTACT_EMAIL', ''),
        'phone': os.environ.get('CONTACT_PHONE') or '+226 74 03 35 29',
        'whatsapp': os.environ.get('CONTACT_WHATSAPP') or '22674033529',
        'location': os.environ.get('CONTACT_LOCATION') or 'Ouagadougou, Karpala',
        'mapsUrl': os.environ.get('CONTACT_MAPS_URL') or 'https://www.google.com/maps/search/?api=1&query=Karpala%2C%20Ouagadougou%2C%20Burkina%20Faso',
        'socials': [{'label': label, 'url': os.environ.get(key) or defaults.get(key)}
                    for label, key in networks if os.environ.get(key) or defaults.get(key)],
    }
