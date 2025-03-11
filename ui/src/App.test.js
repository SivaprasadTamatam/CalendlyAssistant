import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders scheduling dashboard heading and time slots', async () => {
  render(<App />);
  
  // Check if the dashboard heading is present
  const headingElement = screen.getByText(/Scheduling Dashboard/i);
  expect(headingElement).toBeInTheDocument();
  
  // Wait for "Available Time Slots" to be rendered
  await waitFor(() => {
    expect(screen.getByText(/Available Time Slots/i)).toBeInTheDocument();
  });

  // Optionally, if the time slots are visible, check that the buttons are rendered
  const slotButtons = screen.queryAllByRole('button');
  expect(slotButtons.length).toBeGreaterThan(0); // Check if any buttons are rendered
});
