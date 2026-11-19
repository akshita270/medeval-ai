#!/bin/bash
echo "=== DISK DIAGNOSTIC ===" >> /var/log/eb-engine.log
df -h >> /var/log/eb-engine.log
mount | grep -E "tmp|/$" >> /var/log/eb-engine.log
echo "=== END DIAGNOSTIC ===" >> /var/log/eb-engine.log
