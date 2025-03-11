// reportWebVitals.js

// Function to report web vitals (performance metrics)
const reportWebVitals = (onPerfEntry) => {
  // Check if the callback is provided and is a function
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    // Dynamically import web-vitals library to measure performance metrics
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Record the respective performance metrics using the callback provided
      getCLS(onPerfEntry); // Cumulative Layout Shift
      getFID(onPerfEntry); // First Input Delay
      getFCP(onPerfEntry); // First Contentful Paint
      getLCP(onPerfEntry); // Largest Contentful Paint
      getTTFB(onPerfEntry); // Time to First Byte
    });
  }
};

export default reportWebVitals;
