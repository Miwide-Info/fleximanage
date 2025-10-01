#!/bin/bash

# FlexiWAN Performance Testing and Monitoring Script
# This script tests various performance aspects and provides recommendations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://local.miwide.com:3443}"
API_URL="${BASE_URL}/api"
PERFORMANCE_URL="${API_URL}/performance"
ROUNDS="${ROUNDS:-5}"

echo -e "${BLUE}=== FlexiWAN Performance Testing & Monitoring ===${NC}"
echo "Base URL: $BASE_URL"
echo "Test Rounds: $ROUNDS"
echo ""

# Function to test API endpoint performance
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    local url="${API_URL}${endpoint}"
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "URL: $url"
    
    # Test multiple rounds and calculate average
    local total_time=0
    local successful_requests=0
    local failed_requests=0
    
    for i in $(seq 1 $ROUNDS); do
        # Use curl with timing and error handling
        response=$(curl -sk -w "@-" -o /dev/null "$url" 2>/dev/null << 'EOF' || echo "FAILED"
time_total: %{time_total}
http_code: %{http_code}
size_download: %{size_download}
EOF
)
        
        if [[ "$response" != "FAILED" ]]; then
            time_total=$(echo "$response" | grep "time_total:" | cut -d' ' -f2)
            http_code=$(echo "$response" | grep "http_code:" | cut -d' ' -f2)
            size_download=$(echo "$response" | grep "size_download:" | cut -d' ' -f2)
            
            if [[ "$http_code" == "200" ]]; then
                total_time=$(echo "$total_time + $time_total" | bc -l)
                successful_requests=$((successful_requests + 1))
                echo "  Round $i: ${time_total}s (${size_download} bytes)"
            else
                echo "  Round $i: HTTP $http_code"
                failed_requests=$((failed_requests + 1))
            fi
        else
            echo "  Round $i: FAILED"
            failed_requests=$((failed_requests + 1))
        fi
    done
    
    if [[ $successful_requests -gt 0 ]]; then
        local avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l)
        echo -e "  ${GREEN}Average Response Time: ${avg_time}s${NC}"
        echo -e "  ${GREEN}Success Rate: $successful_requests/$ROUNDS${NC}"
        
        # Performance assessment
        if (( $(echo "$avg_time < 0.1" | bc -l) )); then
            echo -e "  ${GREEN}Performance: Excellent${NC}"
        elif (( $(echo "$avg_time < 0.5" | bc -l) )); then
            echo -e "  ${YELLOW}Performance: Good${NC}"
        elif (( $(echo "$avg_time < 1.0" | bc -l) )); then
            echo -e "  ${YELLOW}Performance: Acceptable${NC}"
        else
            echo -e "  ${RED}Performance: Needs Optimization${NC}"
        fi
    else
        echo -e "  ${RED}All requests failed${NC}"
    fi
    
    echo ""
}

# Function to get system metrics
get_system_metrics() {
    echo -e "${BLUE}=== System Performance Metrics ===${NC}"
    
    # Docker container stats
    echo -e "${YELLOW}Docker Container Resources:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" | grep flexi || echo "No FlexiWAN containers found"
    echo ""
    
    # Application performance metrics
    echo -e "${YELLOW}Application Metrics:${NC}"
    metrics_response=$(curl -sk "${PERFORMANCE_URL}/metrics" 2>/dev/null || echo "Failed to fetch metrics")
    
    if [[ "$metrics_response" != "Failed to fetch metrics" ]]; then
        # Parse JSON response (basic parsing)
        memory_heap=$(echo "$metrics_response" | grep -o '"heapUsed":[0-9.]*' | cut -d':' -f2)
        memory_rss=$(echo "$metrics_response" | grep -o '"rss":[0-9.]*' | cut -d':' -f2)
        uptime=$(echo "$metrics_response" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
        
        if [[ -n "$memory_heap" ]] && [[ -n "$memory_rss" ]] && [[ -n "$uptime" ]]; then
            echo "  Heap Memory: ${memory_heap}MB"
            echo "  RSS Memory: ${memory_rss}MB"
            echo "  Uptime: ${uptime}s"
            
            # Memory usage assessment
            if (( $(echo "$memory_heap < 100" | bc -l) )); then
                echo -e "  ${GREEN}Memory Usage: Low${NC}"
            elif (( $(echo "$memory_heap < 300" | bc -l) )); then
                echo -e "  ${YELLOW}Memory Usage: Moderate${NC}"
            else
                echo -e "  ${RED}Memory Usage: High${NC}"
            fi
        fi
    else
        echo "  Could not fetch application metrics"
    fi
    echo ""
}

# Function to test cache performance
test_cache_performance() {
    echo -e "${BLUE}=== Cache Performance Test ===${NC}"
    
    # Test the same endpoint multiple times to see cache hits
    endpoint="/public/meta"
    url="${API_URL}${endpoint}"
    
    echo "Testing cache performance with repeated requests to: $endpoint"
    
    for i in $(seq 1 3); do
        echo -n "Request $i: "
        response=$(curl -sk -w "Time: %{time_total}s" -H "Cache-Control: no-cache" "$url" 2>/dev/null | tail -1)
        echo "$response"
    done
    
    echo ""
    
    # Check cache statistics
    echo "Cache Statistics:"
    cache_stats=$(curl -sk "${PERFORMANCE_URL}/summary" 2>/dev/null || echo "Failed")
    if [[ "$cache_stats" != "Failed" ]]; then
        echo "$cache_stats" | grep -E '"(hits|misses|keys)"' || echo "Cache stats not available"
    fi
    echo ""
}

# Function to run database performance tests
test_database_performance() {
    echo -e "${BLUE}=== Database Performance Analysis ===${NC}"
    
    # Check MongoDB connection
    echo "MongoDB Connection Test:"
    mongo_test=$(docker exec flexi-mongo-primary mongo --eval "db.runCommand('ping')" --quiet 2>/dev/null || echo "FAILED")
    if [[ "$mongo_test" == *"ok"* ]]; then
        echo -e "  ${GREEN}MongoDB: Connected${NC}"
        
        # Get database stats
        echo "Database Statistics:"
        docker exec flexi-mongo-primary mongo flexiwan --eval "
            print('Collections: ' + db.getCollectionNames().length);
            var stats = db.stats();
            print('Database Size: ' + Math.round(stats.dataSize / 1024 / 1024 * 100) / 100 + ' MB');
            print('Index Size: ' + Math.round(stats.indexSize / 1024 / 1024 * 100) / 100 + ' MB');
        " --quiet 2>/dev/null | grep -E "(Collections|Size):" || echo "Could not fetch database stats"
    else
        echo -e "  ${RED}MongoDB: Connection Failed${NC}"
    fi
    
    # Check Redis connection
    echo ""
    echo "Redis Connection Test:"
    redis_test=$(docker exec flexi-redis redis-cli ping 2>/dev/null || echo "FAILED")
    if [[ "$redis_test" == "PONG" ]]; then
        echo -e "  ${GREEN}Redis: Connected${NC}"
        
        # Get Redis info
        echo "Redis Statistics:"
        docker exec flexi-redis redis-cli info memory | grep -E "(used_memory_human|used_memory_peak_human)" || echo "Could not fetch Redis stats"
    else
        echo -e "  ${RED}Redis: Connection Failed${NC}"
    fi
    echo ""
}

# Function to generate performance report
generate_report() {
    echo -e "${BLUE}=== Performance Optimization Recommendations ===${NC}"
    
    # Get application health
    health_response=$(curl -sk "${PERFORMANCE_URL}/health" 2>/dev/null || echo "Failed")
    
    echo "Current System Health:"
    if [[ "$health_response" != "Failed" ]]; then
        status=$(echo "$health_response" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
        if [[ "$status" == "healthy" ]]; then
            echo -e "  ${GREEN}Status: Healthy${NC}"
        else
            echo -e "  ${YELLOW}Status: $status${NC}"
        fi
    else
        echo -e "  ${RED}Status: Unable to determine${NC}"
    fi
    
    echo ""
    echo "Optimization Recommendations:"
    echo "1. 📊 Monitor performance metrics regularly via /api/performance/metrics"
    echo "2. 🗃️  Run index optimization: docker exec flexi-mongo-primary mongo < scripts/optimize-indexes.js"
    echo "3. 💾 Enable Redis persistence for better cache performance"
    echo "4. 🔧 Adjust memory limits in docker-compose.yml based on usage patterns"
    echo "5. 📈 Consider horizontal scaling if CPU usage consistently > 70%"
    echo "6. 🗑️  Implement log rotation and cleanup for long-running instances"
    echo "7. 🚀 Use the optimized Docker files for production deployment"
    echo ""
    
    # Performance score calculation (basic)
    local score=100
    
    # Check if metrics are available
    if [[ "$health_response" == "Failed" ]]; then
        score=$((score - 20))
        echo -e "${RED}⚠️  Performance monitoring not available (-20 points)${NC}"
    fi
    
    echo -e "${BLUE}Overall Performance Score: $score/100${NC}"
    
    if [[ $score -ge 80 ]]; then
        echo -e "${GREEN}✅ Excellent performance!${NC}"
    elif [[ $score -ge 60 ]]; then
        echo -e "${YELLOW}⚠️  Good performance, some optimizations recommended${NC}"
    else
        echo -e "${RED}❌ Performance issues detected, optimization needed${NC}"
    fi
}

# Main execution
main() {
    # Check if curl and bc are available
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}Error: curl is required but not installed${NC}"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        echo -e "${YELLOW}Warning: bc not available, some calculations will be skipped${NC}"
    fi
    
    # Test basic connectivity
    echo -e "${YELLOW}Testing basic connectivity...${NC}"
    if curl -sk --max-time 10 "$BASE_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is accessible${NC}"
    else
        echo -e "${RED}❌ Application is not accessible at $BASE_URL${NC}"
        exit 1
    fi
    echo ""
    
    # Run performance tests
    test_endpoint "/health" "Health Check Endpoint"
    test_endpoint "/public/meta" "Public Metadata (Cached)"
    test_endpoint "/performance/summary" "Performance Summary"
    
    # System metrics
    get_system_metrics
    
    # Cache performance
    test_cache_performance
    
    # Database performance
    test_database_performance
    
    # Generate report
    generate_report
    
    echo -e "${BLUE}=== Performance Testing Complete ===${NC}"
    echo "For continuous monitoring, bookmark: ${BASE_URL}/api/performance/metrics"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "FlexiWAN Performance Testing Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --rounds N          Number of test rounds per endpoint (default: 5)"
        echo "  --url URL           Base URL to test (default: https://local.miwide.com:3443)"
        echo ""
        echo "Environment Variables:"
        echo "  BASE_URL            Base URL for testing"
        echo "  ROUNDS              Number of test rounds"
        echo ""
        echo "Examples:"
        echo "  $0                              # Run with defaults"
        echo "  $0 --rounds 10 --url http://localhost:3000"
        echo "  BASE_URL=http://localhost:3000 ROUNDS=10 $0"
        exit 0
        ;;
    --rounds)
        ROUNDS="$2"
        shift 2
        ;;
    --url)
        BASE_URL="$2"
        API_URL="${BASE_URL}/api"
        PERFORMANCE_URL="${API_URL}/performance"
        shift 2
        ;;
    *)
        ;;
esac

# Run main function
main "$@"